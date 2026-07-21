// Troca da própria senha do administrador (exige a senha atual; nova com mínimo 8).

import bcrypt from 'bcryptjs';
import { exigirAdmin, jsonErro, jsonOk, lerJson, origemValida } from '@/lib/http';
import { obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;

  const corpo = await lerJson<{ senha_atual?: string; nova_senha?: string }>(req);
  if (!corpo) return jsonErro('Não conseguimos ler os dados enviados.');

  const senhaAtual = typeof corpo.senha_atual === 'string' ? corpo.senha_atual : '';
  const novaSenha = typeof corpo.nova_senha === 'string' ? corpo.nova_senha : '';
  if (novaSenha.length < 8) {
    return jsonErro('A senha nova precisa ter pelo menos 8 caracteres.');
  }

  try {
    const dados = await obterDados();
    const admin = await dados.adminPorId(acesso.sessao.id);
    if (!admin) return jsonErro('Sessão inválida. Entre novamente.', 401);

    const confere = senhaAtual && (await bcrypt.compare(senhaAtual, admin.password_hash));
    if (!confere) {
      return jsonErro('A senha atual não confere. Confira e tente de novo.', 401);
    }

    await dados.definirSenhaAdmin(admin.id, await bcrypt.hash(novaSenha, 10));
    return jsonOk({ ok: true });
  } catch {
    return jsonErro('Não conseguimos trocar a senha agora. Tente de novo em instantes.', 500);
  }
}
