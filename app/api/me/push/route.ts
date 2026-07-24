// Inscrição do aparelho do morador para receber notificações push.

import { exigirMorador, jsonErro, jsonOk, lerJson, origemValida } from '@/lib/http';
import { obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

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
    !endpoint.startsWith('https://') ||
    typeof p256dh !== 'string' ||
    typeof auth !== 'string'
  ) {
    return jsonErro('Inscrição de notificação inválida.');
  }

  try {
    const dados = await obterDados();
    await dados.salvarInscricaoPush(acesso.sessao.id, endpoint.slice(0, 1000), p256dh, auth);
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
  if (typeof corpo?.endpoint !== 'string') return jsonErro('Inscrição inválida.');

  try {
    const dados = await obterDados();
    await dados.removerInscricaoPush(corpo.endpoint);
    return jsonOk({ ok: true });
  } catch {
    return jsonErro('Não conseguimos desativar agora. Tente de novo.', 500);
  }
}
