// Troca de senha do morador logado. Quando a senha é temporária (redefinida pelo
// admin), a senha atual não é exigida — o morador acabou de entrar com ela.

import bcrypt from 'bcryptjs';
import { jsonErro, jsonOk, lerJson, origemValida } from '@/lib/http';
import { gravarSessao, obterSessao } from '@/lib/sessao';
import { obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);

  const sessao = obterSessao();
  if (!sessao || sessao.papel !== 'morador') {
    return jsonErro('Sua sessão terminou. Entre novamente.', 401);
  }

  const corpo = await lerJson<{ senha_atual?: string; nova_senha?: string }>(req);
  if (!corpo) return jsonErro('Não conseguimos ler os dados enviados. Tente de novo.');

  const novaSenha = typeof corpo.nova_senha === 'string' ? corpo.nova_senha : '';
  if (novaSenha.length < 6) {
    return jsonErro('A senha nova precisa ter pelo menos 6 letras ou números.');
  }

  try {
    const dados = await obterDados();
    const morador = await dados.moradorPorId(sessao.id);
    if (!morador) return jsonErro('Cadastro não encontrado. Entre novamente.', 401);

    if (!morador.must_change) {
      const senhaAtual = typeof corpo.senha_atual === 'string' ? corpo.senha_atual : '';
      const confere = senhaAtual && (await bcrypt.compare(senhaAtual, morador.password_hash));
      if (!confere) {
        return jsonErro('A senha atual não confere. Confira e tente de novo.', 401);
      }
    }

    const novoHash = await bcrypt.hash(novaSenha, 10);
    await dados.definirSenhaMorador(morador.id, novoHash, false);
    // Renova o cookie com a marca da senha nova: as sessões antigas (outros
    // aparelhos) deixam de valer, mas quem trocou continua conectado.
    gravarSessao('morador', morador.id, novoHash);
    return jsonOk({ ok: true });
  } catch {
    return jsonErro('Não conseguimos trocar a senha agora. Tente de novo em instantes.', 500);
  }
}
