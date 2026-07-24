// Conversa da equipe com um morador: lista (marcando como lidas) e responde.
// A resposta da equipe dispara notificação push no celular do morador.

import { exigirAdmin, jsonErro, jsonOk, lerJson, origemValida } from '@/lib/http';
import { notificarMorador } from '@/lib/push';
import { obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

function idValido(bruto: string): number | null {
  const id = Number(bruto);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;
  const id = idValido(params.id);
  if (!id) return jsonErro('Cadastro não encontrado.', 404);

  try {
    const dados = await obterDados();
    const morador = await dados.moradorPorId(id);
    if (!morador) return jsonErro('Cadastro não encontrado.', 404);
    await dados.marcarMensagensLidas(id, 'equipe');
    const mensagens = await dados.listarMensagens(id);
    return jsonOk({
      morador: { id: morador.id, nome: morador.full_name, protocolo: morador.protocol },
      mensagens: mensagens.map(({ id: msgId, sender, text, created_at }) => ({
        id: msgId,
        remetente: sender,
        texto: text,
        criada_em: created_at,
      })),
    });
  } catch {
    return jsonErro('Não conseguimos carregar a conversa agora.', 500);
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;
  const id = idValido(params.id);
  if (!id) return jsonErro('Cadastro não encontrado.', 404);

  const corpo = await lerJson<{ texto?: string }>(req);
  const texto = (typeof corpo?.texto === 'string' ? corpo.texto : '').trim().slice(0, 2000);
  if (texto.length < 1) return jsonErro('Escreva a mensagem antes de enviar.');

  try {
    const dados = await obterDados();
    const morador = await dados.moradorPorId(id);
    if (!morador) return jsonErro('Cadastro não encontrado.', 404);

    const mensagem = await dados.enviarMensagem(id, 'equipe', texto);
    await notificarMorador(dados, id, {
      titulo: 'ADEHASC — nova mensagem',
      corpo: 'A equipe respondeu você. Toque para ler a conversa.',
      url: '/painel/conversa',
    });

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
