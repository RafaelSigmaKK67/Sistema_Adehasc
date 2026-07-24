// Caixa de entrada da equipe: todas as conversas, com contagem de não lidas.

import { exigirAdmin, jsonErro, jsonOk } from '@/lib/http';
import { obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;

  try {
    const dados = await obterDados();
    return jsonOk({ conversas: await dados.listarConversas() });
  } catch {
    return jsonErro('Não conseguimos carregar as conversas agora.', 500);
  }
}
