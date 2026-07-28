// Dados do morador logado: leitura completa e edição de telefone/e-mail.

import { normalizarTelefone } from '@/lib/formatar';
import { exigirMorador, jsonErro, jsonOk, lerJson, origemValida } from '@/lib/http';
import { marcaDaSenha } from '@/lib/sessao';
import { moradorPublico, obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const acesso = exigirMorador();
  if ('resposta' in acesso) return acesso.resposta;

  try {
    const dados = await obterDados();
    const morador = await dados.moradorPorId(acesso.sessao.id);
    if (!morador) return jsonErro('Cadastro não encontrado. Entre novamente.', 401);
    // Senha trocada ou redefinida pela equipe derruba as sessões antigas.
    if (acesso.sessao.sv && acesso.sessao.sv !== marcaDaSenha(morador.password_hash)) {
      return jsonErro('Sua senha foi alterada. Entre novamente.', 401);
    }

    const [atualizacoes, documentos, comunicados, mensagens] = await Promise.all([
      dados.listarAtualizacoes(morador.id),
      dados.listarDocumentos(morador.id),
      dados.listarComunicadosDoMorador(morador.id),
      dados.listarMensagens(morador.id),
    ]);

    return jsonOk({
      morador: moradorPublico(morador),
      atualizacoes,
      documentos: documentos.map(({ id, name, status }) => ({ id, name, status })),
      comunicados: comunicados.map(({ id, title, body, author, created_at }) => ({
        id,
        title,
        body,
        author,
        created_at,
      })),
      mensagens_nao_lidas: mensagens.filter((m) => m.sender === 'equipe' && !m.read_by_resident)
        .length,
    });
  } catch {
    return jsonErro('Não conseguimos carregar os seus dados agora. Tente de novo.', 500);
  }
}

export async function PATCH(req: Request) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);
  const acesso = exigirMorador();
  if ('resposta' in acesso) return acesso.resposta;

  const corpo = await lerJson<{ telefone?: string; email?: string | null }>(req);
  if (!corpo) return jsonErro('Não conseguimos ler os dados enviados. Tente de novo.');

  const telefone = normalizarTelefone(typeof corpo.telefone === 'string' ? corpo.telefone : '');
  if (telefone.length < 10 || telefone.length > 11) {
    return jsonErro('Escreva o telefone com DDD. Por exemplo: (49) 98503-1080.');
  }
  let email: string | null = null;
  if (typeof corpo.email === 'string' && corpo.email.trim()) {
    email = corpo.email.trim().slice(0, 200);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonErro('Este e-mail não parece completo. Confira se tem @ e o final (.com, .br…).');
    }
  }

  try {
    const dados = await obterDados();
    // O morador só edita telefone e e-mail — o resto é com a equipe.
    const morador = await dados.atualizarMorador(acesso.sessao.id, { phone: telefone, email });
    if (!morador) return jsonErro('Cadastro não encontrado. Entre novamente.', 401);
    return jsonOk({ morador: moradorPublico(morador) });
  } catch {
    return jsonErro('Não conseguimos salvar agora. Tente de novo em instantes.', 500);
  }
}
