// Modelo padrão do comunicado: o admin lê e salva o documento-base que usa nos envios.

import { exigirAdmin, jsonErro, jsonOk, lerJson, origemValida } from '@/lib/http';
import { obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;
  try {
    const dados = await obterDados();
    return jsonOk({ modelo: await dados.obterModeloComunicado() });
  } catch {
    return jsonErro('Não conseguimos carregar o modelo agora.', 500);
  }
}

export async function PUT(req: Request) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;

  const corpo = await lerJson<{ titulo?: string; corpo?: string }>(req);
  if (!corpo) return jsonErro('Não conseguimos ler os dados enviados.');

  const titulo = (typeof corpo.titulo === 'string' ? corpo.titulo : '').trim().slice(0, 200);
  const texto = (typeof corpo.corpo === 'string' ? corpo.corpo : '').trim().slice(0, 5000);
  if (titulo.length < 3) return jsonErro('Escreva o título do modelo.');
  if (texto.length < 10) return jsonErro('Escreva o texto do modelo.');

  try {
    const dados = await obterDados();
    await dados.salvarModeloComunicado({ titulo, corpo: texto });
    return jsonOk({ ok: true });
  } catch {
    return jsonErro('Não conseguimos salvar o modelo agora.', 500);
  }
}
