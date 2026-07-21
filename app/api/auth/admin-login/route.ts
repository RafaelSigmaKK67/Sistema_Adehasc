import bcrypt from 'bcryptjs';
import { ipDe, jsonErro, jsonOk, lerJson, limiteExcedido, limparLimite, origemValida } from '@/lib/http';
import { gravarSessao } from '@/lib/sessao';
import { obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);

  const corpo = await lerJson<{ email?: string; senha?: string }>(req);
  if (!corpo) return jsonErro('Não conseguimos ler os dados enviados. Tente de novo.');

  const email = (typeof corpo.email === 'string' ? corpo.email : '').trim().toLowerCase();
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
  if (!email || !senha) {
    return jsonErro('Escreva o e-mail e a senha para entrar.');
  }

  const chaveLimite = `admin-login:${ipDe(req)}:${email}`;
  if (limiteExcedido(chaveLimite)) {
    return jsonErro('Muitas tentativas seguidas. Aguarde 10 minutos e tente de novo.', 429);
  }

  try {
    const dados = await obterDados();
    const admin = await dados.adminPorEmail(email);
    const confere = admin && (await bcrypt.compare(senha, admin.password_hash));
    if (!admin || !confere) {
      return jsonErro('E-mail ou senha não conferem.', 401);
    }
    limparLimite(chaveLimite);
    gravarSessao('admin', admin.id);
    return jsonOk({ ok: true });
  } catch {
    return jsonErro('Não conseguimos entrar agora. Tente de novo em instantes.', 500);
  }
}
