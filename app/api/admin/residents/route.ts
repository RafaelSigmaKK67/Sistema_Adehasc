import { exigirAdmin, jsonErro, jsonOk } from '@/lib/http';
import { obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

const POR_PAGINA = 25;

export async function GET(req: Request) {
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim().slice(0, 120);
  const etapaParam = Number(url.searchParams.get('etapa') || '');
  const etapa = Number.isInteger(etapaParam) && etapaParam >= 1 && etapaParam <= 7 ? etapaParam : undefined;
  const municipio = (url.searchParams.get('municipio') || '').trim().slice(0, 120) || undefined;
  const paginaParam = Number(url.searchParams.get('pagina') || '1');
  const pagina = Number.isInteger(paginaParam) && paginaParam >= 1 ? paginaParam : 1;

  try {
    const dados = await obterDados();
    const [{ moradores, total }, municipios] = await Promise.all([
      dados.listarMoradores({ q, etapa, municipio, pagina, porPagina: POR_PAGINA }),
      dados.listarMunicipios(),
    ]);
    return jsonOk({
      moradores: moradores.map((m) => ({
        id: m.id,
        protocol: m.protocol,
        full_name: m.full_name,
        cpf: m.cpf,
        city: m.city,
        stage: m.stage,
        created_at: m.created_at,
      })),
      total,
      pagina,
      paginas: Math.max(Math.ceil(total / POR_PAGINA), 1),
      municipios,
    });
  } catch {
    return jsonErro('Não conseguimos carregar a lista agora.', 500);
  }
}
