import { exigirAdmin, jsonErro, jsonOk, lerJson, origemValida } from '@/lib/http';
import { obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return jsonErro('Cadastro não encontrado.', 404);

  const corpo = await lerJson<{ texto?: string }>(req);
  if (!corpo) return jsonErro('Não conseguimos ler os dados enviados.');

  const texto = (typeof corpo.texto === 'string' ? corpo.texto : '').trim().slice(0, 2000);
  if (texto.length < 2) return jsonErro('Escreva a anotação antes de salvar.');

  try {
    const dados = await obterDados();
    const morador = await dados.moradorPorId(id);
    if (!morador) return jsonErro('Cadastro não encontrado.', 404);
    const nota = await dados.adicionarNota(id, texto);
    return jsonOk({ nota }, 201);
  } catch {
    return jsonErro('Não conseguimos salvar a nota agora. Tente de novo em instantes.', 500);
  }
}
