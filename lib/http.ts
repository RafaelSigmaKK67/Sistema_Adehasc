// Auxiliares das rotas de API: respostas JSON, verificação de origem e limite de tentativas.

import { NextResponse } from 'next/server';
import { obterSessao, Sessao } from '@/lib/sessao';

export function jsonOk(dados: unknown, status = 200): NextResponse {
  return NextResponse.json(dados, { status });
}

export function jsonErro(mensagem: string, status = 400): NextResponse {
  return NextResponse.json({ erro: mensagem }, { status });
}

/** Verificação de mesma origem em toda rota que altera dados (proteção CSRF). */
export function origemValida(req: Request): boolean {
  const origem = req.headers.get('origin');
  if (!origem) return true; // requisições sem Origin (ex.: aplicativo mobile futuro)
  const host = req.headers.get('host');
  if (!host) return false;
  try {
    return new URL(origem).host === host;
  } catch {
    return false;
  }
}

export function ipDe(req: Request): string {
  const encaminhado = req.headers.get('x-forwarded-for');
  if (encaminhado) return encaminhado.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'local';
}

// ---- limite simples de tentativas (em memória, por IP + identificador) ----

type Registro = { tentativas: number; ate: number };

function mapaLimites(): Map<string, Registro> {
  const g = globalThis as { __adehascLimites?: Map<string, Registro> };
  if (!g.__adehascLimites) g.__adehascLimites = new Map();
  return g.__adehascLimites;
}

const MAX_TENTATIVAS = 5;
const JANELA_MS = 10 * 60 * 1000; // 10 minutos

/** Registra uma tentativa e diz se o limite foi ultrapassado. */
export function limiteExcedido(chave: string, max = MAX_TENTATIVAS, janelaMs = JANELA_MS): boolean {
  const mapa = mapaLimites();
  const agora = Date.now();
  if (mapa.size > 5000) {
    for (const [k, v] of mapa) if (v.ate < agora) mapa.delete(k);
  }
  const registro = mapa.get(chave);
  if (!registro || registro.ate < agora) {
    mapa.set(chave, { tentativas: 1, ate: agora + janelaMs });
    return false;
  }
  registro.tentativas += 1;
  return registro.tentativas > max;
}

/** Limpa o contador após um acesso bem-sucedido. */
export function limparLimite(chave: string): void {
  mapaLimites().delete(chave);
}

// ---- exigência de sessão ----

export function exigirAdmin(): { sessao: Sessao } | { resposta: NextResponse } {
  const sessao = obterSessao();
  if (!sessao || sessao.papel !== 'admin') {
    return { resposta: jsonErro('Acesso restrito à equipe. Entre novamente.', 401) };
  }
  return { sessao };
}

export function exigirMorador(): { sessao: Sessao } | { resposta: NextResponse } {
  const sessao = obterSessao();
  if (!sessao || sessao.papel !== 'morador') {
    return { resposta: jsonErro('Sua sessão terminou. Entre novamente.', 401) };
  }
  return { sessao };
}

/** Lê o corpo JSON com segurança (retorna null se não for JSON válido). */
export async function lerJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
