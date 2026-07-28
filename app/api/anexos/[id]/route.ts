// Entrega o arquivo de um anexo do chat. O morador só abre os próprios;
// a equipe abre qualquer um.

import { jsonErro, sessaoAindaValida } from '@/lib/http';
import { obterSessao } from '@/lib/sessao';
import { obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sessao = obterSessao();
  if (!sessao) return jsonErro('Sua sessão terminou. Entre novamente.', 401);
  // Documentos são dados sensíveis: se a senha mudou, a sessão antiga não vale.
  if (!(await sessaoAindaValida(sessao))) {
    return jsonErro('Sua senha foi alterada. Entre novamente.', 401);
  }

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return jsonErro('Arquivo não encontrado.', 404);

  try {
    const dados = await obterDados();
    const anexo = await dados.obterAnexo(id);
    if (!anexo) return jsonErro('Arquivo não encontrado.', 404);
    if (sessao.papel === 'morador' && anexo.resident_id !== sessao.id) {
      return jsonErro('Arquivo não encontrado.', 404);
    }

    const conteudo = Buffer.from(anexo.dados_base64, 'base64');
    const nomeAscii = anexo.nome.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
    return new Response(new Uint8Array(conteudo), {
      status: 200,
      headers: {
        'Content-Type': anexo.mime,
        'Content-Length': String(conteudo.length),
        'Content-Disposition': `inline; filename="${nomeAscii}"; filename*=UTF-8''${encodeURIComponent(anexo.nome)}`,
        // Nunca guardar em cache: em um aparelho compartilhado, outra conta
        // não pode reaproveitar o documento baixado pela sessão anterior.
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return jsonErro('Não conseguimos abrir o arquivo agora. Tente de novo.', 500);
  }
}
