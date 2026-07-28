// Inscrição do aparelho do morador para receber notificações push.

import { exigirMorador, jsonErro, jsonOk, lerJson, origemValida } from '@/lib/http';
import { obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

// Endpoints legítimos dos serviços de push dos navegadores.
const HOSTS_PUSH_PERMITIDOS = [
  'android.googleapis.com',
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'updates-autopush.stage.mozaws.net',
  'web.push.apple.com',
  'notify.windows.com',
];

function endpointConfiavel(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:') return false;
    return HOSTS_PUSH_PERMITIDOS.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

type CorpoInscricao = {
  inscricao?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
};

export async function POST(req: Request) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);
  const acesso = exigirMorador();
  if ('resposta' in acesso) return acesso.resposta;

  const corpo = await lerJson<CorpoInscricao>(req);
  const endpoint = corpo?.inscricao?.endpoint;
  const p256dh = corpo?.inscricao?.keys?.p256dh;
  const auth = corpo?.inscricao?.keys?.auth;
  if (
    typeof endpoint !== 'string' ||
    endpoint.length > 1000 ||
    !endpointConfiavel(endpoint) ||
    typeof p256dh !== 'string' ||
    p256dh.length > 200 ||
    typeof auth !== 'string' ||
    auth.length > 100
  ) {
    return jsonErro('Inscrição de notificação inválida.');
  }

  try {
    const dados = await obterDados();
    // Upsert por endpoint: se o aparelho era de outra conta (celular
    // compartilhado), a inscrição passa a ser de quem está logado agora.
    await dados.salvarInscricaoPush(acesso.sessao.id, endpoint, p256dh, auth);
    return jsonOk({ ok: true }, 201);
  } catch {
    return jsonErro('Não conseguimos ativar as notificações agora. Tente de novo.', 500);
  }
}

export async function DELETE(req: Request) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);
  const acesso = exigirMorador();
  if ('resposta' in acesso) return acesso.resposta;

  const corpo = await lerJson<{ endpoint?: string }>(req);
  const endpoint = corpo?.endpoint;
  if (typeof endpoint !== 'string') return jsonErro('Inscrição inválida.');

  try {
    const dados = await obterDados();
    // Só remove se a inscrição for mesmo deste morador.
    const minhas = await dados.listarInscricoesPush(acesso.sessao.id);
    if (!minhas.some((inscricao) => inscricao.endpoint === endpoint)) {
      return jsonOk({ ok: true }); // nada a fazer; não revela nada de outra conta
    }
    await dados.removerInscricaoPush(endpoint);
    return jsonOk({ ok: true });
  } catch {
    return jsonErro('Não conseguimos desativar agora. Tente de novo.', 500);
  }
}
