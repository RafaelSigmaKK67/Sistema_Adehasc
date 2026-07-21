import { SITUACOES_DOCUMENTO, SituacaoDocumento } from '@/lib/etapas';
import { exigirAdmin, jsonErro, jsonOk, lerJson, origemValida } from '@/lib/http';
import { obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return jsonErro('Cadastro não encontrado.', 404);

  const corpo = await lerJson<{ documento_id?: number; situacao?: string }>(req);
  if (!corpo) return jsonErro('Não conseguimos ler os dados enviados.');

  const documentoId = Number(corpo.documento_id);
  if (!Number.isInteger(documentoId) || documentoId <= 0) {
    return jsonErro('Documento não encontrado.', 404);
  }
  const situacao = corpo.situacao as SituacaoDocumento;
  if (!SITUACOES_DOCUMENTO.includes(situacao)) {
    return jsonErro('A situação precisa ser: pendente, recebido ou aprovado.');
  }

  try {
    const dados = await obterDados();
    const documento = await dados.atualizarDocumento(id, documentoId, situacao);
    if (!documento) return jsonErro('Documento não encontrado.', 404);
    return jsonOk({ documento });
  } catch {
    return jsonErro('Não conseguimos salvar agora. Tente de novo em instantes.', 500);
  }
}
