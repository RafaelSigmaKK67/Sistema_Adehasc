// Camada de dados: uma interface, duas implementações (Postgres e memória/demonstração).

import { modoDemonstracao } from '@/lib/ambiente';
import { SituacaoDocumento } from '@/lib/etapas';

// Os nomes dos campos espelham exatamente as colunas do banco.
export type Morador = {
  id: number;
  protocol: string;
  full_name: string;
  cpf: string; // só dígitos
  birth_date: string | null; // dd/mm/aaaa
  phone: string; // só dígitos
  email: string | null;
  marital_status: string | null;
  city: string;
  neighborhood: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  years_living: number | null;
  property_type: string | null;
  password_hash: string;
  stage: number;
  must_change: boolean;
  created_at: string;
  updated_at: string;
};

export type Atualizacao = {
  id: number;
  resident_id: number;
  message: string;
  stage: number | null;
  author: string;
  created_at: string;
};

export type Documento = {
  id: number;
  resident_id: number;
  name: string;
  status: SituacaoDocumento;
  updated_at: string;
};

export type Nota = {
  id: number;
  resident_id: number;
  text: string;
  created_at: string;
};

export type Admin = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  password_changed: boolean;
  created_at: string;
};

export type NovoMorador = Omit<
  Morador,
  'id' | 'protocol' | 'stage' | 'must_change' | 'created_at' | 'updated_at'
>;

export type CamposMorador = Partial<
  Omit<Morador, 'id' | 'protocol' | 'password_hash' | 'created_at' | 'updated_at'>
>;

export type FiltroMoradores = {
  q?: string;
  etapa?: number;
  municipio?: string;
  pagina: number;
  porPagina: number;
};

export type Estatisticas = {
  total: number;
  emAndamento: number;
  concluidos: number;
  novos30: number;
  porEtapa: number[]; // índice 0 = etapa 1 … índice 6 = etapa 7
  ultimos: Morador[];
  senhaAdminPadraoPendente: boolean;
};

export interface Dados {
  init(): Promise<void>;

  criarMorador(dados: NovoMorador): Promise<Morador>;
  moradorPorCpf(cpf: string): Promise<Morador | null>;
  moradorPorId(id: number): Promise<Morador | null>;
  atualizarMorador(id: number, campos: CamposMorador): Promise<Morador | null>;
  definirSenhaMorador(id: number, hash: string, deveTrocar: boolean): Promise<void>;
  excluirMorador(id: number): Promise<boolean>;
  listarMoradores(f: FiltroMoradores): Promise<{ moradores: Morador[]; total: number }>;
  listarMunicipios(): Promise<string[]>;
  todosMoradores(): Promise<Morador[]>;
  estatisticas(): Promise<Estatisticas>;

  adicionarAtualizacao(
    moradorId: number,
    mensagem: string,
    etapa: number | null,
    autor?: string
  ): Promise<Atualizacao>;
  listarAtualizacoes(moradorId: number): Promise<Atualizacao[]>;

  listarDocumentos(moradorId: number): Promise<Documento[]>;
  atualizarDocumento(
    moradorId: number,
    documentoId: number,
    situacao: SituacaoDocumento
  ): Promise<Documento | null>;

  adicionarNota(moradorId: number, texto: string): Promise<Nota>;
  listarNotas(moradorId: number): Promise<Nota[]>;

  adminPorEmail(email: string): Promise<Admin | null>;
  adminPorId(id: number): Promise<Admin | null>;
  criarAdmin(nome: string, email: string, hash: string, senhaTrocada: boolean): Promise<Admin>;
  listarAdmins(): Promise<Admin[]>;
  definirSenhaAdmin(id: number, hash: string): Promise<void>;
}

export function gerarProtocolo(id: number, criadoEm: string): string {
  // Ano no fuso de Brasília, o mesmo usado em todas as datas exibidas no sistema.
  const ano = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
  }).format(new Date(criadoEm));
  return `ADH-${ano}-${String(id).padStart(5, '0')}`;
}

/** Erro de duplicidade lançado pela camada de memória (equivalente ao UNIQUE do Postgres). */
export class ErroDuplicado extends Error {
  constructor(public campo: 'cpf' | 'email') {
    super(`Valor duplicado para ${campo}`);
    this.name = 'ErroDuplicado';
  }
}

/** Reconhece duplicidade vinda de qualquer camada (memória ou UNIQUE do Postgres, código 23505). */
export function eErroDuplicado(erro: unknown): boolean {
  if (erro instanceof ErroDuplicado) return true;
  return (
    typeof erro === 'object' &&
    erro !== null &&
    (erro as { code?: string }).code === '23505'
  );
}

/** Remove o hash de senha antes de responder qualquer API. */
export function moradorPublico(m: Morador): Omit<Morador, 'password_hash'> {
  const { password_hash: _omitido, ...resto } = m;
  return resto;
}

export function adminPublico(a: Admin): Omit<Admin, 'password_hash'> {
  const { password_hash: _omitido, ...resto } = a;
  return resto;
}

let prontos: Promise<Dados> | null = null;

/** Obtém a camada de dados já inicializada (tabelas criadas / demonstração semeada). */
export function obterDados(): Promise<Dados> {
  if (!prontos) {
    prontos = (async () => {
      const impl: Dados = modoDemonstracao()
        ? (await import('@/lib/store-memoria')).dadosMemoria
        : (await import('@/lib/store-postgres')).dadosPostgres;
      await impl.init();
      return impl;
    })().catch((erro) => {
      prontos = null;
      throw erro;
    });
  }
  return prontos;
}
