// Mudança de etapa: atualiza o processo e publica automaticamente uma
// atualização na linha do tempo do morador.

import { etapaInfo } from '@/lib/etapas';
import { exigirAdmin, jsonErro, jsonOk, lerJson, origemValida } from '@/lib/http';
import { notificarMorador } from '@/lib/push';
import { obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return jsonErro('Cadastro não encontrado.', 404);

  const corpo = await lerJson<{ etapa?: number; mensagem?: string | null }>(req);
  if (!corpo) return jsonErro('Não conseguimos ler os dados enviados.');

  const etapa = Number(corpo.etapa);
  if (!Number.isInteger(etapa) || etapa < 1 || etapa > 7) {
    return jsonErro('Escolha uma etapa de 1 a 7.');
  }
  const mensagemPersonalizada =
    typeof corpo.mensagem === 'string' ? corpo.mensagem.trim().slice(0, 2000) : '';

  try {
    const dados = await obterDados();
    const morador = await dados.moradorPorId(id);
    if (!morador) return jsonErro('Cadastro não encontrado.', 404);

    await dados.atualizarMorador(id, { stage: etapa });
    const mensagem = mensagemPersonalizada || etapaInfo(etapa).texto;
    const atualizacao = await dados.adicionarAtualizacao(id, mensagem, etapa);
    await notificarMorador(dados, id, {
      titulo: 'ADEHASC — seu processo andou!',
      corpo: `Nova etapa: ${etapaInfo(etapa).titulo}. Toque para ver o andamento.`,
      url: '/painel',
    });

    return jsonOk({ ok: true, etapa, atualizacao });
  } catch {
    return jsonErro('Não conseguimos mudar a etapa agora. Tente de novo em instantes.', 500);
  }
}
