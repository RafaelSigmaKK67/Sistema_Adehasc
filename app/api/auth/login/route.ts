import bcrypt from 'bcryptjs';
import { limparCpf } from '@/lib/cpf';
import { ipDe, jsonErro, jsonOk, lerJson, limiteExcedido, limparLimite, origemValida } from '@/lib/http';
import { gravarSessao } from '@/lib/sessao';
import { obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);

  const corpo = await lerJson<{ cpf?: string; senha?: string }>(req);
  if (!corpo) return jsonErro('Não conseguimos ler os dados enviados. Tente de novo.');

  const cpf = limparCpf(typeof corpo.cpf === 'string' ? corpo.cpf : '');
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
  if (cpf.length !== 11 || !senha) {
    return jsonErro('Escreva o CPF e a senha para entrar.');
  }

  const chaveLimite = `login:${ipDe(req)}:${cpf}`;
  if (limiteExcedido(chaveLimite)) {
    return jsonErro('Muitas tentativas seguidas. Aguarde 10 minutos e tente de novo.', 429);
  }

  try {
    const dados = await obterDados();
    const morador = await dados.moradorPorCpf(cpf);
    const confere = morador && (await bcrypt.compare(senha, morador.password_hash));
    if (!morador || !confere) {
      return jsonErro('CPF ou senha não conferem. Confira e tente de novo.', 401);
    }
    limparLimite(chaveLimite);
    gravarSessao('morador', morador.id);
    return jsonOk({ ok: true, trocar_senha: morador.must_change });
  } catch {
    return jsonErro('Não conseguimos entrar agora. Tente de novo em instantes.', 500);
  }
}
