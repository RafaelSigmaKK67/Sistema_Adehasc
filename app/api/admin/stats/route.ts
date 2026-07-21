import { modoDemonstracao, segredoConfigurado } from '@/lib/ambiente';
import { exigirAdmin, jsonErro, jsonOk } from '@/lib/http';
import { obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;

  try {
    const dados = await obterDados();
    const estatisticas = await dados.estatisticas();
    return jsonOk({
      total: estatisticas.total,
      emAndamento: estatisticas.emAndamento,
      concluidos: estatisticas.concluidos,
      novos30: estatisticas.novos30,
      porEtapa: estatisticas.porEtapa,
      ultimos: estatisticas.ultimos.map((m) => ({
        id: m.id,
        protocol: m.protocol,
        full_name: m.full_name,
        cpf: m.cpf,
        city: m.city,
        stage: m.stage,
        created_at: m.created_at,
      })),
      avisos: {
        demonstracao: modoDemonstracao(),
        segredoAusente: !segredoConfigurado(),
        senhaPadraoPendente: estatisticas.senhaAdminPadraoPendente,
      },
    });
  } catch {
    return jsonErro('Não conseguimos carregar as estatísticas agora.', 500);
  }
}
