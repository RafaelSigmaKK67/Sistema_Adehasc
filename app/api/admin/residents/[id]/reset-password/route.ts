// Gera uma senha temporária fácil de ditar por telefone (ex.: KM4729).
// Ela é mostrada uma única vez e o morador é obrigado a trocá-la no próximo acesso.

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { exigirAdmin, jsonErro, jsonOk, origemValida } from '@/lib/http';
import { obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

// Sem letras que confundem ao ditar (I, O, Q…).
const LETRAS = 'ABCDEFGHJKLMNPRSTUVXZ';

function gerarSenhaTemporaria(): string {
  const letra1 = LETRAS[crypto.randomInt(LETRAS.length)];
  const letra2 = LETRAS[crypto.randomInt(LETRAS.length)];
  const numeros = crypto.randomInt(1000, 10000);
  return `${letra1}${letra2}${numeros}`;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return jsonErro('Cadastro não encontrado.', 404);

  try {
    const dados = await obterDados();
    const morador = await dados.moradorPorId(id);
    if (!morador) return jsonErro('Cadastro não encontrado.', 404);

    const senhaTemporaria = gerarSenhaTemporaria();
    await dados.definirSenhaMorador(id, await bcrypt.hash(senhaTemporaria, 10), true);
    return jsonOk({ senha_temporaria: senhaTemporaria });
  } catch {
    return jsonErro('Não conseguimos gerar a senha agora. Tente de novo em instantes.', 500);
  }
}
