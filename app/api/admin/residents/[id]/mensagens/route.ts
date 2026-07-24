// Conversa da equipe com um morador: lista (marcando como lidas) e responde.
// A resposta da equipe dispara notificação push no celular do morador.

import { validarAnexo } from '@/lib/anexos';
import { exigirAdmin, jsonErro, jsonOk, lerJson, origemValida } from '@/lib/http';
import { notificarMorador } from '@/lib/push';
import { NovoAnexo, obterDados } from '@/lib/store';

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
      mensagens: mensagens.map(({ id: msgId, sender, text, created_at, anexo }) => ({
        id: msgId,
        remetente: sender,
        texto: text,
        criada_em: created_at,
        anexo,
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

  const corpo = await lerJson<{ texto?: string; anexo?: unknown }>(req);
  const texto = (typeof corpo?.texto === 'string' ? corpo.texto : '').trim().slice(0, 2000);

  let anexo: NovoAnexo | undefined;
  if (corpo?.anexo) {
    const validacao = validarAnexo(corpo.anexo);
    if ('erro' in validacao) return jsonErro(validacao.erro);
    anexo = validacao.anexo;
  }
  if (texto.length < 1 && !anexo) return jsonErro('Escreva a mensagem ou anexe um arquivo.');

  try {
    const dados = await obterDados();
    const morador = await dados.moradorPorId(id);
    if (!morador) return jsonErro('Cadastro não encontrado.', 404);

    const mensagem = await dados.enviarMensagem(id, 'equipe', texto, anexo);
    await notificarMorador(dados, id, {
      titulo: 'ADEHASC — nova mensagem',
      corpo: anexo
        ? 'A equipe enviou um arquivo para você. Toque para ver.'
        : 'A equipe respondeu você. Toque para ler a conversa.',
      url: '/painel/conversa',
    });

    return jsonOk(
      {
        mensagem: {
          id: mensagem.id,
          remetente: mensagem.sender,
          texto: mensagem.text,
          criada_em: mensagem.created_at,
          anexo: mensagem.anexo,
        },
      },
      201
    );
  } catch {
    return jsonErro('Não conseguimos enviar agora. Tente de novo.', 500);
  }
}
