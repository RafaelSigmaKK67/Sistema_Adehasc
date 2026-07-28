// Conversa do morador com a equipe: lista (marcando como lidas) e envia mensagens.

import { validarAnexo } from '@/lib/anexos';
import { exigirMorador, jsonErro, jsonOk, lerJson, limiteExcedido, origemValida } from '@/lib/http';
import { NovoAnexo, obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

// Ninguém precisa mandar mais que isso numa conversa normal — e assim um
// aparelho travado (ou um script) não enche o banco com anexos.
const MAXIMO_MENSAGENS_POR_MINUTO = 12;
const MAXIMO_ANEXOS_POR_HORA = 20;

export async function GET() {
  const acesso = exigirMorador();
  if ('resposta' in acesso) return acesso.resposta;

  try {
    const dados = await obterDados();
    await dados.marcarMensagensLidas(acesso.sessao.id, 'morador');
    const mensagens = await dados.listarMensagens(acesso.sessao.id);
    return jsonOk({
      mensagens: mensagens.map(({ id, sender, text, created_at, anexo }) => ({
        id,
        remetente: sender,
        texto: text,
        criada_em: created_at,
        anexo,
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

  if (limiteExcedido(`chat:${acesso.sessao.id}`, MAXIMO_MENSAGENS_POR_MINUTO, 60 * 1000)) {
    return jsonErro('Você enviou muitas mensagens seguidas. Aguarde um minuto e tente de novo.', 429);
  }

  const corpo = await lerJson<{ texto?: string; anexo?: unknown }>(req);
  const texto = (typeof corpo?.texto === 'string' ? corpo.texto : '').trim().slice(0, 2000);

  let anexo: NovoAnexo | undefined;
  if (corpo?.anexo) {
    if (limiteExcedido(`anexo:${acesso.sessao.id}`, MAXIMO_ANEXOS_POR_HORA, 60 * 60 * 1000)) {
      return jsonErro(
        'Você enviou muitos arquivos hoje. Aguarde um pouco ou ligue para a gente: (49) 3622-3137.',
        429
      );
    }
    const validacao = validarAnexo(corpo.anexo);
    if ('erro' in validacao) return jsonErro(validacao.erro);
    anexo = validacao.anexo;
  }
  if (texto.length < 1 && !anexo) return jsonErro('Escreva a mensagem ou anexe um arquivo.');

  try {
    const dados = await obterDados();
    const mensagem = await dados.enviarMensagem(acesso.sessao.id, 'morador', texto, anexo);
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
