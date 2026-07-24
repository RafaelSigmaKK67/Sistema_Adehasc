// Comunicados oficiais: o admin escolhe os destinatários (todos, por etapa,
// por município ou um morador) e envia o documento; os campos {nome},
// {protocolo} e {etapa} são preenchidos automaticamente para cada pessoa.

import crypto from 'crypto';
import { limparCpf } from '@/lib/cpf';
import { exigirAdmin, jsonErro, jsonOk, lerJson, origemValida } from '@/lib/http';
import { notificarMorador } from '@/lib/push';
import { Morador, obterDados, preencherModelo } from '@/lib/store';

export const dynamic = 'force-dynamic';

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
      });
    }

    const loteId = crypto.randomUUID();
    for (const morador of destinatarios) {
      const tituloFinal = preencherModelo(titulo, morador);
      await dados.criarComunicado(morador.id, loteId, tituloFinal, preencherModelo(texto, morador));
      await dados.adicionarAtualizacao(
        morador.id,
        `Novo comunicado para você: "${tituloFinal}". Abra a seção Comunicados do seu painel para ler o documento.`,
        null
      );
      await notificarMorador(dados, morador.id, {
        titulo: 'ADEHASC — novo comunicado',
        corpo: tituloFinal,
        url: '/painel',
      });
    }
    return jsonOk({ total: destinatarios.length, lote_id: loteId }, 201);
  } catch {
    return jsonErro('Não conseguimos enviar o comunicado agora. Tente de novo.', 500);
  }
}
