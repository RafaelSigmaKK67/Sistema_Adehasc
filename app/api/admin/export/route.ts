// Exportação em CSV com BOM UTF-8 e separador ';' — abre certinho no Excel brasileiro.

import { etapaInfo } from '@/lib/etapas';
import { formatarCpf, formatarDataHora, mascaraTelefone } from '@/lib/formatar';
import { exigirAdmin, jsonErro } from '@/lib/http';
import { obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

function campoCsv(valor: string | number | null | undefined): string {
  let texto = valor === null || valor === undefined ? '' : String(valor);
  // Proteção contra injeção de fórmula no Excel (=, +, -, @ no início da célula).
  if (/^[=+\-@\t]/.test(texto)) {
    texto = `'${texto}`;
  }
  if (/[";\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export async function GET() {
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;

  try {
    const dados = await obterDados();
    const moradores = await dados.todosMoradores();

    const cabecalho = [
      'Protocolo',
      'Nome completo',
      'CPF',
      'Data de nascimento',
      'Telefone',
      'E-mail',
      'Estado civil',
      'Município',
      'Bairro/Núcleo',
      'Rua',
      'Número',
      'Complemento',
      'Anos no imóvel',
      'Tipo de imóvel',
      'Etapa (número)',
      'Etapa',
      'Senha temporária pendente',
      'Data do cadastro',
      'Última atualização',
    ];

    const linhas = moradores.map((m) =>
      [
        campoCsv(m.protocol),
        campoCsv(m.full_name),
        campoCsv(formatarCpf(m.cpf)),
        campoCsv(m.birth_date),
        campoCsv(mascaraTelefone(m.phone)),
        campoCsv(m.email),
        campoCsv(m.marital_status),
        campoCsv(m.city),
        campoCsv(m.neighborhood),
        campoCsv(m.street),
        campoCsv(m.number),
        campoCsv(m.complement),
        campoCsv(m.years_living),
        campoCsv(m.property_type),
        campoCsv(m.stage),
        campoCsv(etapaInfo(m.stage).titulo),
        campoCsv(m.must_change ? 'Sim' : 'Não'),
        campoCsv(formatarDataHora(m.created_at)),
        campoCsv(formatarDataHora(m.updated_at)),
      ].join(';')
    );

    const BOM = '﻿'; // faz o Excel abrir o arquivo com acentos corretos
    const conteudo = BOM + [cabecalho.join(';'), ...linhas].join('\r\n');
    const hoje = new Date().toISOString().slice(0, 10);

    return new Response(conteudo, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="moradores-adehasc-${hoje}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return jsonErro('Não conseguimos gerar o arquivo agora. Tente de novo em instantes.', 500);
  }
}
