// Conversa do morador com a equipe: lista (marcando como lidas) e envia mensagens.

import { exigirMorador, jsonErro, jsonOk, lerJson, origemValida } from '@/lib/http';
import { obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const acesso = exigirMorador();
  if ('resposta' in acesso) return acesso.resposta;

  try {
    const dados = await obterDados();
    await dados.marcarMensagensLidas(acesso.sessao.id, 'morador');
    const mensagens = await dados.listarMensagens(acesso.sessao.id);
    return jsonOk({
      mensagens: mensagens.map(({ id, sender, text, created_at }) => ({
        id,
        remetente: sender,
        texto: text,
        criada_em: created_at,
      })),
    });
  } catch {
    return jsonErro('Não conseguimos carregar a conversa agora. Tente de novo.', 500);
  }
}

export async function POST(req: Request) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);
  const acesso = exigirMorador();
  if ('resposta' in acesso) return acesso.resposta;

  const corpo = await lerJson<{ texto?: string }>(req);
  const texto = (typeof corpo?.texto === 'string' ? corpo.texto : '').trim().slice(0, 2000);
  if (texto.length < 1) return jsonErro('Escreva a mensagem antes de enviar.');

  try {
    const dados = await obterDados();
    const mensagem = await dados.enviarMensagem(acesso.sessao.id, 'morador', texto);
    return jsonOk(
      {
        mensagem: {
          id: mensagem.id,
          remetente: mensagem.sender,
          texto: mensagem.text,
          criada_em: mensagem.created_at,
        },
      },
      201
    );
  } catch {
    return jsonErro('Não conseguimos enviar agora. Tente de novo.', 500);
  }
}
