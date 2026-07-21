import { modoDemonstracao, segredoConfigurado } from '@/lib/ambiente';
import { jsonOk } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  return jsonOk({
    ok: true,
    modo: modoDemonstracao() ? 'demonstracao' : 'banco',
    segredo_configurado: segredoConfigurado(),
  });
}
