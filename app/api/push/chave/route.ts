// Chave pública do Web Push (VAPID) — o navegador precisa dela para se inscrever.

import { chavePublicaPush } from '@/lib/push';
import { jsonOk } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  return jsonOk({ chave: chavePublicaPush() });
}
