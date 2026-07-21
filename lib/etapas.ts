// As 7 etapas do processo de regularização fundiária (fixas no código).

export type Etapa = { numero: number; titulo: string; texto: string };

export const ETAPAS: Etapa[] = [
  {
    numero: 1,
    titulo: 'Cadastro recebido',
    texto: 'Recebemos o seu cadastro. Nossa equipe vai analisar os seus dados.',
  },
  {
    numero: 2,
    titulo: 'Análise de documentos',
    texto: 'Estamos conferindo os seus documentos. Veja a lista do que falta entregar.',
  },
  {
    numero: 3,
    titulo: 'Vistoria e medição',
    texto: 'Nossa equipe técnica vai visitar o seu imóvel para medir o terreno.',
  },
  {
    numero: 4,
    titulo: 'Elaboração do projeto',
    texto: 'Estamos montando o projeto de regularização da sua área.',
  },
  {
    numero: 5,
    titulo: 'Aprovação na Prefeitura',
    texto: 'O projeto foi entregue à Prefeitura e está em análise.',
  },
  {
    numero: 6,
    titulo: 'Registro em Cartório',
    texto: 'O processo está no Cartório de Registro de Imóveis.',
  },
  {
    numero: 7,
    titulo: 'Título entregue',
    texto: 'Parabéns! O seu título de propriedade foi registrado e entregue.',
  },
];

export function etapaInfo(numero: number): Etapa {
  const n = Math.min(Math.max(Math.round(numero) || 1, 1), 7);
  return ETAPAS[n - 1];
}

export const DOCUMENTOS_PADRAO: string[] = [
  'Documento com foto (RG ou CNH)',
  'CPF',
  'Comprovante de residência (conta de luz ou água)',
  'Certidão de nascimento ou casamento',
  'Contrato ou recibo de compra e venda (se tiver)',
  'Carnê do IPTU ou documento do imóvel (se tiver)',
];

export type SituacaoDocumento = 'pendente' | 'recebido' | 'aprovado';

export const SITUACOES_DOCUMENTO: SituacaoDocumento[] = ['pendente', 'recebido', 'aprovado'];

export const ROTULO_SITUACAO: Record<SituacaoDocumento, string> = {
  pendente: 'Pendente',
  recebido: 'Recebido',
  aprovado: 'Aprovado',
};
