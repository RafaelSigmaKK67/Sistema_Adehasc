import { jsonErro, jsonOk, origemValida } from '@/lib/http';
import { encerrarSessao } from '@/lib/sessao';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);
  encerrarSessao();
  return jsonOk({ ok: true });
}
