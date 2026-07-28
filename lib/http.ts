// Auxiliares das rotas de API: respostas JSON, verificação de origem e limite de tentativas.

import { NextResponse } from 'next/server';
import { marcaDaSenha, obterSessao, Sessao } from '@/lib/sessao';
import { obterDados } from '@/lib/store';

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

/**
 * Registra uma tentativa e diz se o limite foi ultrapassado.
 *
 * Atenção: o contador vive na memória da instância. Em servidor sem estado
 * (Vercel), cada instância tem o seu — por isso o login usa também um teto por
 * IP (`limiteLoginExcedido`), que estreita bastante a janela de força bruta.
 * Para bloqueio forte, o caminho é um contador no banco ou um WAF.
 */
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

/**
 * Limite das telas de entrada: conta as tentativas por conta E por IP.
 * O teto por IP impede varrer muitas contas diferentes com poucas tentativas
 * em cada uma (password spraying).
 */
export function limiteLoginExcedido(req: Request, identificador: string, prefixo: string): boolean {
  const ip = ipDe(req);
  const porConta = limiteExcedido(`${prefixo}:${ip}:${identificador}`);
  const porIp = limiteExcedido(`${prefixo}-ip:${ip}`, 30, JANELA_MS);
  return porConta || porIp;
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

/**
 * Confere se a sessão ainda corresponde à senha atual do morador. Usada nas
 * rotas que leem ou alteram dados: se a equipe redefiniu a senha (ou o próprio
 * morador trocou), as sessões antigas param de valer.
 */
export async function sessaoAindaValida(sessao: Sessao): Promise<boolean> {
  if (!sessao.sv) return true; // sessão anterior a este recurso: não derruba ninguém
  try {
    const dados = await obterDados();
    const atual =
      sessao.papel === 'admin'
        ? await dados.adminPorId(sessao.id)
        : await dados.moradorPorId(sessao.id);
    if (!atual) return false;
    return marcaDaSenha(atual.password_hash) === sessao.sv;
  } catch {
    return true; // instabilidade do banco não pode expulsar quem está usando
  }
}

/** Lê o corpo JSON com segurança (retorna null se não for JSON válido). */
export async function lerJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
