// Importação de moradores por CSV.
// GET  — baixa a planilha modelo (Excel brasileiro: BOM UTF-8 e separador ';').
// POST — importa um lote de até 20 moradores por chamada (a tela envia em partes);
//        cada morador entra com senha temporária e troca obrigatória no 1º acesso.

import bcrypt from 'bcryptjs';
import { cpfValido, limparCpf } from '@/lib/cpf';
import { etapaInfo } from '@/lib/etapas';
import { dataValida, normalizarTelefone } from '@/lib/formatar';
import { exigirAdmin, jsonErro, jsonOk, lerJson, origemValida } from '@/lib/http';
import { gerarSenhaTemporaria } from '@/lib/senha-temporaria';
import { eErroDuplicado, obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LOTE_MAXIMO = 20;

export async function GET() {
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;

  const cabecalho = [
    'Nome completo',
    'CPF',
    'Telefone',
    'Data de nascimento',
    'E-mail',
    'Estado civil',
    'Município',
    'Bairro',
    'Rua',
    'Número',
    'Complemento',
    'Anos no imóvel',
    'Tipo de imóvel',
    'Etapa',
  ];
  const exemplos = [
    'Maria Exemplo da Silva;123.456.789-09;(49) 98888-7777;12/03/1955;maria@example.com;Viúvo(a);Concórdia;Centro;Rua das Flores;120;;25;Casa;1',
    'João Exemplo de Souza;412.563.987-64;(49) 97777-8888;;;Casado(a);Seara;;;;;;Terreno;3',
  ];
  const conteudo = '﻿' + [cabecalho.join(';'), ...exemplos].join('\r\n');
  return new Response(conteudo, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="modelo-importacao-moradores.csv"',
      'Cache-Control': 'no-store',
    },
  });
}

type MoradorImportado = {
  nome?: string;
  cpf?: string;
  telefone?: string;
  nascimento?: string;
  email?: string;
  estado_civil?: string;
  municipio?: string;
  bairro?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  anos_moradia?: string;
  tipo_imovel?: string;
  etapa?: string;
};

function texto(valor: unknown, maximo = 200): string {
  return typeof valor === 'string' ? valor.trim().slice(0, maximo) : '';
}

function textoOuNulo(valor: unknown, maximo = 200): string | null {
  const limpo = texto(valor, maximo);
  return limpo || null;
}

export async function POST(req: Request) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;

  const corpo = await lerJson<{ moradores?: MoradorImportado[] }>(req);
  if (!corpo || !Array.isArray(corpo.moradores) || corpo.moradores.length === 0) {
    return jsonErro('Nenhum morador para importar.');
  }
  if (corpo.moradores.length > LOTE_MAXIMO) {
    return jsonErro(`Envie no máximo ${LOTE_MAXIMO} moradores por vez.`);
  }

  const dados = await obterDados();
  const resultados: {
    cpf: string;
    nome: string;
    ok: boolean;
    protocolo?: string;
    senha_temporaria?: string;
    erro?: string;
  }[] = [];

  for (const item of corpo.moradores) {
    const nome = texto(item.nome);
    const cpf = limparCpf(texto(item.cpf, 20));
    const telefone = normalizarTelefone(texto(item.telefone, 25));
    const municipio = texto(item.municipio, 120);
    const nascimento = textoOuNulo(item.nascimento, 10);
    const email = textoOuNulo(item.email, 200);
    const etapaTexto = texto(item.etapa, 5);
    const etapa = etapaTexto ? Number(etapaTexto) : 1;
    const resumo = { cpf, nome: nome || '(sem nome)' };
    // Marca que o cadastro já foi criado: se um ajuste posterior falhar, a
    // senha temporária não pode sumir do relatório.
    let moradorCriado = false;

    // Mesmas regras do cadastro feito pelo próprio morador.
    if (nome.length < 5) {
      resultados.push({ ...resumo, ok: false, erro: 'Nome incompleto.' });
      continue;
    }
    if (!cpfValido(cpf)) {
      resultados.push({ ...resumo, ok: false, erro: 'CPF inválido.' });
      continue;
    }
    if (telefone.length < 10 || telefone.length > 11) {
      resultados.push({ ...resumo, ok: false, erro: 'Telefone precisa ter DDD.' });
      continue;
    }
    if (municipio.length < 2) {
      resultados.push({ ...resumo, ok: false, erro: 'Município em branco.' });
      continue;
    }
    if (nascimento && !dataValida(nascimento)) {
      resultados.push({ ...resumo, ok: false, erro: 'Data de nascimento inválida (use dd/mm/aaaa).' });
      continue;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      resultados.push({ ...resumo, ok: false, erro: 'E-mail inválido.' });
      continue;
    }
    if (etapaTexto && (!Number.isInteger(etapa) || etapa < 1 || etapa > 7)) {
      resultados.push({ ...resumo, ok: false, erro: 'Etapa precisa ser de 1 a 7.' });
      continue;
    }
    let anosMoradia: number | null = null;
    const anosTexto = texto(item.anos_moradia, 5);
    if (anosTexto) {
      const anos = Number(anosTexto);
      if (!Number.isInteger(anos) || anos < 0 || anos > 120) {
        resultados.push({ ...resumo, ok: false, erro: 'Anos no imóvel precisa ser um número.' });
        continue;
      }
      anosMoradia = anos;
    }

    try {
      const existente = await dados.moradorPorCpf(cpf);
      if (existente) {
        resultados.push({ ...resumo, ok: false, erro: `CPF já cadastrado (${existente.protocol}).` });
        continue;
      }

      const senhaTemporaria = gerarSenhaTemporaria();
      const morador = await dados.criarMorador({
        full_name: nome,
        cpf,
        birth_date: nascimento,
        phone: telefone,
        email,
        marital_status: textoOuNulo(item.estado_civil, 40),
        city: municipio,
        neighborhood: textoOuNulo(item.bairro, 120),
        street: textoOuNulo(item.rua, 160),
        number: textoOuNulo(item.numero, 20),
        complement: textoOuNulo(item.complemento, 120),
        years_living: anosMoradia,
        property_type: textoOuNulo(item.tipo_imovel, 40),
        password_hash: await bcrypt.hash(senhaTemporaria, 10),
      });
      moradorCriado = true;

      // O morador já existe a partir daqui: a senha temporária NÃO pode se
      // perder se algum ajuste seguinte falhar.
      resultados.push({
        ...resumo,
        ok: true,
        protocolo: morador.protocol,
        senha_temporaria: senhaTemporaria,
      });

      await dados.atualizarMorador(morador.id, {
        must_change: true,
        ...(etapa > 1 ? { stage: etapa } : {}),
      });
      if (etapa > 1) {
        // Mesma coerência do painel: mudar de etapa deixa registro na linha
        // do tempo que o morador vê.
        await dados.adicionarAtualizacao(morador.id, etapaInfo(etapa).texto, etapa);
      }
    } catch (erro) {
      if (moradorCriado) {
        // Cadastro criado, ajuste posterior falhou: o resultado com a senha já
        // foi guardado; a equipe corrige a etapa pela ficha se precisar.
        continue;
      }
      resultados.push({
        ...resumo,
        ok: false,
        erro: eErroDuplicado(erro) ? 'CPF já cadastrado.' : 'Erro ao salvar. Tente de novo.',
      });
    }
  }

  return jsonOk({ resultados });
}
