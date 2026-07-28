// Leitura de CSV para a importação de moradores — aceita separador ';' ou ',',
// campos entre aspas, BOM do Excel e cabeçalhos com ou sem acento.

/** Uma linha do arquivo, guardando o número real dela na planilha. */
export type LinhaCsv = { numero: number; colunas: string[] };

/**
 * Lê o CSV preservando o número original de cada linha (linhas em branco são
 * puladas, mas não deslocam a contagem — o erro apontado bate com o Excel).
 */
export function analisarCsvComNumero(texto: string): LinhaCsv[] {
  const linhas: LinhaCsv[] = [];
  let numero = 0;
  for (const colunas of analisarCsvBruto(texto)) {
    numero += 1;
    if (colunas.some((valor) => valor.trim() !== '')) {
      linhas.push({ numero, colunas });
    }
  }
  return linhas;
}

export function analisarCsv(texto: string): string[][] {
  return analisarCsvComNumero(texto).map((linha) => linha.colunas);
}

/** Divide o texto em linhas/campos, sem descartar linha nenhuma. */
function analisarCsvBruto(texto: string): string[][] {
  const limpo = (texto || '').replace(/^﻿/, '');
  const primeiraLinha = limpo.split(/\r?\n/, 1)[0] || '';
  const separador =
    (primeiraLinha.match(/;/g) || []).length >= (primeiraLinha.match(/,/g) || []).length
      ? ';'
      : ',';

  const linhas: string[][] = [];
  let campo = '';
  let linha: string[] = [];
  let entreAspas = false;

  const fecharLinha = () => {
    linha.push(campo);
    campo = '';
    linhas.push(linha);
    linha = [];
  };

  for (let i = 0; i < limpo.length; i++) {
    const caractere = limpo[i];
    if (entreAspas) {
      if (caractere === '"') {
        if (limpo[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          entreAspas = false;
        }
      } else {
        campo += caractere;
      }
    } else if (caractere === '"' && campo === '') {
      // Aspas só delimitam quando abrem o campo. Uma aspa solta no meio do
      // texto (ex.: 5" de altura) é caractere comum e não engole o arquivo.
      entreAspas = true;
    } else if (caractere === separador) {
      linha.push(campo);
      campo = '';
    } else if (caractere === '\n' || caractere === '\r') {
      if (caractere === '\r' && limpo[i + 1] === '\n') i++;
      fecharLinha();
    } else {
      campo += caractere;
    }
  }
  if (campo !== '' || linha.length > 0) fecharLinha();
  return linhas;
}

export type CampoImportacao =
  | 'nome'
  | 'cpf'
  | 'telefone'
  | 'nascimento'
  | 'email'
  | 'estado_civil'
  | 'municipio'
  | 'bairro'
  | 'rua'
  | 'numero'
  | 'complemento'
  | 'anos_moradia'
  | 'tipo_imovel'
  | 'etapa';

const NOMES_ACEITOS: Record<CampoImportacao, string[]> = {
  nome: ['nome', 'nome completo', 'nome do morador'],
  cpf: ['cpf'],
  telefone: ['telefone', 'celular', 'whatsapp', 'telefone/whatsapp', 'fone', 'telefone ou whatsapp'],
  nascimento: ['nascimento', 'data de nascimento', 'data nascimento'],
  email: ['email', 'e-mail'],
  estado_civil: ['estado civil'],
  municipio: ['municipio', 'cidade', 'municipio (cidade)'],
  bairro: ['bairro', 'nucleo', 'bairro/nucleo', 'bairro ou nucleo'],
  rua: ['rua', 'endereco', 'logradouro'],
  numero: ['numero', 'n', 'no', 'num'],
  complemento: ['complemento'],
  anos_moradia: ['anos no imovel', 'anos de moradia', 'anos moradia', 'anos'],
  tipo_imovel: ['tipo de imovel', 'tipo do imovel', 'tipo'],
  etapa: ['etapa', 'etapa (numero)', 'etapa numero'],
};

export function normalizarCabecalho(valor: string): string {
  return (valor || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[*:]/g, '')
    .trim();
}

/** Descobre em qual coluna está cada campo, pelo nome do cabeçalho. */
export function mapearCabecalho(
  cabecalho: string[]
): Partial<Record<CampoImportacao, number>> {
  const indices: Partial<Record<CampoImportacao, number>> = {};
  cabecalho.forEach((titulo, indice) => {
    const normalizado = normalizarCabecalho(titulo);
    for (const campo of Object.keys(NOMES_ACEITOS) as CampoImportacao[]) {
      if (indices[campo] === undefined && NOMES_ACEITOS[campo].includes(normalizado)) {
        indices[campo] = indice;
      }
    }
  });
  return indices;
}
