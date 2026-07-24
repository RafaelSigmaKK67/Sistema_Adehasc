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

  const corpo = await lerJson<{ mensagem?: string }>(req);
  if (!corpo) return jsonErro('Não conseguimos ler os dados enviados.');

  const mensagem = (typeof corpo.mensagem === 'string' ? corpo.mensagem : '').trim().slice(0, 2000);
  if (mensagem.length < 3) return jsonErro('Escreva a mensagem antes de publicar.');

  try {
    const dados = await obterDados();
    const morador = await dados.moradorPorId(id);
    if (!morador) return jsonErro('Cadastro não encontrado.', 404);
    const atualizacao = await dados.adicionarAtualizacao(id, mensagem, null);
    await notificarMorador(dados, id, {
      titulo: 'ADEHASC — nova atualização',
      corpo: 'A equipe publicou uma novidade no seu processo. Toque para ler.',
      url: '/painel',
    });
    return jsonOk({ atualizacao }, 201);
  } catch {
    return jsonErro('Não conseguimos publicar agora. Tente de novo em instantes.', 500);
  }
}
