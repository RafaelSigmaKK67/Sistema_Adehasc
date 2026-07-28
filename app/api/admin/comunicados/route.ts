// Comunicados oficiais: o admin escolhe os destinatários (todos, por etapa,
// por município ou um morador) e envia o documento; os campos {nome},
// {protocolo} e {etapa} são preenchidos automaticamente para cada pessoa.

import crypto from 'crypto';
import { limparCpf } from '@/lib/cpf';
import { exigirAdmin, jsonErro, jsonOk, lerJson, origemValida } from '@/lib/http';
import { notificarMorador } from '@/lib/push';
import { Morador, obterDados, preencherModelo } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Teto por envio: acima disso o admin filtra por etapa/município. Evita que a
// função seja morta no meio e o lote fique pela metade.
const MAXIMO_DESTINATARIOS = 800;
// Quantos moradores processamos ao mesmo tempo (banco e push aguentam bem).
const PARALELISMO = 10;

async function emBlocos<T>(itens: T[], tamanho: number, tarefa: (item: T) => Promise<void>) {
  for (let inicio = 0; inicio < itens.length; inicio += tamanho) {
    await Promise.all(itens.slice(inicio, inicio + tamanho).map(tarefa));
  }
}

export async function GET() {
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;
  try {
    const dados = await obterDados();
    return jsonOk({ lotes: await dados.listarLotesComunicados() });
  } catch {
    return jsonErro('Não conseguimos carregar o histórico agora.', 500);
  }
}

type Destino = { tipo?: string; valor?: string };
type Corpo = { titulo?: string; corpo?: string; destino?: Destino; somente_contar?: boolean };

function filtrarDestinatarios(moradores: Morador[], destino: Destino): Morador[] | null {
  const valor = (destino.valor || '').trim();
  switch (destino.tipo) {
    case 'todos':
      return moradores;
    case 'etapa': {
      const etapa = Number(valor);
      if (!Number.isInteger(etapa) || etapa < 1 || etapa > 7) return null;
      return moradores.filter((m) => m.stage === etapa);
    }
    case 'municipio':
      if (!valor) return null;
      return moradores.filter((m) => m.city === valor);
    case 'morador': {
      if (!valor) return null;
      const digitos = limparCpf(valor);
      const chave = valor.toLowerCase();
      return moradores.filter(
        (m) =>
          m.protocol.toLowerCase() === chave ||
          (digitos.length === 11 && m.cpf === digitos)
      );
    }
    default:
      return null;
  }
}

export async function POST(req: Request) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;

  const corpo = await lerJson<Corpo>(req);
  if (!corpo) return jsonErro('Não conseguimos ler os dados enviados.');

  const titulo = (typeof corpo.titulo === 'string' ? corpo.titulo : '').trim().slice(0, 200);
  const texto = (typeof corpo.corpo === 'string' ? corpo.corpo : '').trim().slice(0, 5000);
  if (titulo.length < 3) return jsonErro('Escreva o título do comunicado.');
  if (texto.length < 10) return jsonErro('Escreva o texto do comunicado.');
  if (!corpo.destino || typeof corpo.destino !== 'object') {
    return jsonErro('Escolha para quem enviar o comunicado.');
  }

  try {
    const dados = await obterDados();
    const todos = await dados.todosMoradores();
    const destinatarios = filtrarDestinatarios(todos, corpo.destino);
    if (destinatarios === null) {
      return jsonErro('Escolha para quem enviar o comunicado.');
    }
    if (destinatarios.length === 0) {
      return jsonErro('Nenhum morador encontrado para esse destino. Confira o filtro.', 404);
    }

    if (corpo.somente_contar) {
      return jsonOk({
        total: destinatarios.length,
        amostra: destinatarios.slice(0, 5).map((m) => m.full_name),
        acima_do_limite: destinatarios.length > MAXIMO_DESTINATARIOS,
        limite: MAXIMO_DESTINATARIOS,
      });
    }

    if (destinatarios.length > MAXIMO_DESTINATARIOS) {
      return jsonErro(
        `São ${destinatarios.length} moradores de uma vez — o máximo por envio é ${MAXIMO_DESTINATARIOS}. ` +
          'Envie em partes, filtrando por etapa ou município.',
        413
      );
    }

    const loteId = crypto.randomUUID();
    // Primeiro as gravações (rápidas), em blocos paralelos.
    await emBlocos(destinatarios, PARALELISMO, async (morador) => {
      const tituloFinal = preencherModelo(titulo, morador);
      await dados.criarComunicado(morador.id, loteId, tituloFinal, preencherModelo(texto, morador));
      await dados.adicionarAtualizacao(
        morador.id,
        `Novo comunicado para você: "${tituloFinal}". Abra a seção Comunicados do seu painel para ler o documento.`,
        null
      );
    });
    // Depois as notificações — sem dado pessoal no aviso, porque ele aparece
    // na tela bloqueada do celular, que qualquer um por perto consegue ler.
    await emBlocos(destinatarios, PARALELISMO, async (morador) => {
      await notificarMorador(dados, morador.id, {
        titulo: 'ADEHASC',
        corpo: 'Você recebeu um novo comunicado. Toque para ler no seu painel.',
        url: '/painel',
      });
    });
    return jsonOk({ total: destinatarios.length, lote_id: loteId }, 201);
  } catch {
    return jsonErro('Não conseguimos enviar o comunicado agora. Tente de novo.', 500);
  }
}
