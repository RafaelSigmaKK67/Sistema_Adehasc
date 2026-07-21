// Lista e criação de administradores.

import bcrypt from 'bcryptjs';
import { adminPublico, eErroDuplicado, obterDados } from '@/lib/store';
import { exigirAdmin, jsonErro, jsonOk, lerJson, origemValida } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;

  try {
    const dados = await obterDados();
    const admins = await dados.listarAdmins();
    return jsonOk({ admins: admins.map(adminPublico) });
  } catch {
    return jsonErro('Não conseguimos carregar a lista agora.', 500);
  }
}

export async function POST(req: Request) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;

  const corpo = await lerJson<{ nome?: string; email?: string; senha?: string }>(req);
  if (!corpo) return jsonErro('Não conseguimos ler os dados enviados.');

  const nome = (typeof corpo.nome === 'string' ? corpo.nome : '').trim().slice(0, 120);
  const email = (typeof corpo.email === 'string' ? corpo.email : '').trim().toLowerCase().slice(0, 200);
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';

  if (nome.length < 3) return jsonErro('Escreva o nome da pessoa.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonErro('Escreva um e-mail válido.');
  if (senha.length < 8) return jsonErro('A senha precisa ter pelo menos 8 caracteres.');

  try {
    const dados = await obterDados();
    const existente = await dados.adminPorEmail(email);
    if (existente) return jsonErro('Já existe um administrador com este e-mail.', 409);

    const admin = await dados.criarAdmin(nome, email, await bcrypt.hash(senha, 10), true);
    return jsonOk({ admin: adminPublico(admin) }, 201);
  } catch (erro) {
    if (eErroDuplicado(erro)) {
      return jsonErro('Já existe um administrador com este e-mail.', 409);
    }
    return jsonErro('Não conseguimos criar o administrador agora. Tente de novo.', 500);
  }
}
