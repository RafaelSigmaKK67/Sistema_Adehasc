// Sessão própria: cookie httpOnly assinado com HMAC-SHA256, validade de 7 dias.

import crypto from 'crypto';
import { cookies } from 'next/headers';

export const NOME_COOKIE = 'adehasc_sessao';
const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;
const SETE_DIAS_S = 7 * 24 * 60 * 60;

export type Papel = 'morador' | 'admin';
/** `sv` (senha-versão) é a marca da senha vigente quando a sessão foi criada. */
export type Sessao = { papel: Papel; id: number; exp: number; sv?: string };

// Sem AUTH_SECRET em produção, usa um segredo aleatório por processo: as sessões
// deixam de valer a cada reinício (o painel admin avisa), mas nunca são forjáveis.
const segredoAleatorioDoProcesso = crypto.randomBytes(32).toString('hex');

function segredo(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === 'production') return segredoAleatorioDoProcesso;
  return 'adehasc-segredo-apenas-para-desenvolvimento-local';
}

function assinar(dados: string): string {
  return crypto.createHmac('sha256', segredo()).update(dados).digest('base64url');
}

/**
 * Marca curta derivada do hash da senha. Quando a senha muda, a marca muda e
 * as sessões abertas com a senha antiga param de valer.
 */
export function marcaDaSenha(hashSenha: string): string {
  return crypto.createHash('sha256').update(hashSenha).digest('base64url').slice(0, 12);
}

export function criarToken(papel: Papel, id: number, hashSenha?: string): string {
  const carga = Buffer.from(
    JSON.stringify({
      papel,
      id,
      exp: Date.now() + SETE_DIAS_MS,
      ...(hashSenha ? { sv: marcaDaSenha(hashSenha) } : {}),
    }),
    'utf8'
  ).toString('base64url');
  return `${carga}.${assinar(carga)}`;
}

export function lerToken(token: string | undefined | null): Sessao | null {
  if (!token) return null;
  const partes = token.split('.');
  if (partes.length !== 2) return null;
  const [carga, assinatura] = partes;
  const esperada = assinar(carga);
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const sessao = JSON.parse(Buffer.from(carga, 'base64url').toString('utf8')) as Sessao;
    if (!sessao || typeof sessao.id !== 'number' || typeof sessao.exp !== 'number') return null;
    if (sessao.papel !== 'morador' && sessao.papel !== 'admin') return null;
    if (sessao.exp < Date.now()) return null;
    return sessao;
  } catch {
    return null;
  }
}

/** Lê a sessão do cookie da requisição atual (route handlers e componentes de servidor). */
export function obterSessao(): Sessao | null {
  return lerToken(cookies().get(NOME_COOKIE)?.value);
}

export function gravarSessao(papel: Papel, id: number, hashSenha?: string): void {
  cookies().set(NOME_COOKIE, criarToken(papel, id, hashSenha), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SETE_DIAS_S,
  });
}

export function encerrarSessao(): void {
  cookies().set(NOME_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
