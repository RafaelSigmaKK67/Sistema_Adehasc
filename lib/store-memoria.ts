// Modo demonstração: dados em memória com moradores fictícios (CPFs matematicamente válidos).
// Nada é gravado em disco — ao reiniciar, tudo volta ao estado inicial.

import bcrypt from 'bcryptjs';
import { DOCUMENTOS_PADRAO, SituacaoDocumento, etapaInfo } from '@/lib/etapas';
import {
  Admin,
  Atualizacao,
  CamposMorador,
  Comunicado,
  Conversa,
  Dados,
  Documento,
  ErroDuplicado,
  Estatisticas,
  FiltroMoradores,
  InscricaoPush,
  LoteComunicado,
  MODELO_COMUNICADO_PADRAO,
  Mensagem,
  ModeloComunicado,
  Morador,
  Nota,
  NovoMorador,
  RemetenteMensagem,
  gerarProtocolo,
} from '@/lib/store';

type Banco = {
  moradores: Morador[];
  atualizacoes: Atualizacao[];
  documentos: Documento[];
  notas: Nota[];
  admins: Admin[];
  comunicados: Comunicado[];
  mensagens: Mensagem[];
  inscricoesPush: InscricaoPush[];
  modeloComunicado: ModeloComunicado;
  seq: {
    morador: number;
    atualizacao: number;
    documento: number;
    nota: number;
    admin: number;
    comunicado: number;
    mensagem: number;
    inscricao: number;
  };
};

function agoraIso(): string {
  return new Date().toISOString();
}

function diasAtras(dias: number): string {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
}

const SENHA_DEMONSTRACAO = '123456';

type SementeMorador = {
  nome: string;
  cpf: string;
  nascimento: string;
  telefone: string;
  email: string | null;
  estadoCivil: string;
  municipio: string;
  bairro: string;
  rua: string;
  numero: string;
  anosMoradia: number;
  tipoImovel: string;
  etapa: number;
  diasCadastro: number;
};

const SEMENTES: SementeMorador[] = [
  { nome: 'Maria de Lourdes Ferreira', cpf: '52998224725', nascimento: '12/03/1952', telefone: '49985031234', email: null, estadoCivil: 'Viúvo(a)', municipio: 'Concórdia', bairro: 'Vista Alegre', rua: 'Rua das Palmeiras', numero: '87', anosMoradia: 34, tipoImovel: 'Casa', etapa: 7, diasCadastro: 290 },
  { nome: 'João Batista dos Santos', cpf: '87328439173', nascimento: '05/08/1958', telefone: '49991402211', email: 'joao.santos@example.com', estadoCivil: 'Casado(a)', municipio: 'Concórdia', bairro: 'Nazaré', rua: 'Rua Marechal Deodoro', numero: '1520', anosMoradia: 27, tipoImovel: 'Casa', etapa: 5, diasCadastro: 220 },
  { nome: 'Terezinha Gonçalves', cpf: '70452911834', nascimento: '22/11/1949', telefone: '49984775302', email: null, estadoCivil: 'Solteiro(a)', municipio: 'Seara', bairro: 'Centro', rua: 'Rua Anita Garibaldi', numero: '44', anosMoradia: 41, tipoImovel: 'Casa', etapa: 3, diasCadastro: 150 },
  { nome: 'Antônio Carlos Pereira', cpf: '36144728090', nascimento: '17/01/1961', telefone: '49999118844', email: 'antonio.pereira@example.com', estadoCivil: 'Casado(a)', municipio: 'Concórdia', bairro: 'Itaíba', rua: 'Rua dos Ipês', numero: '310', anosMoradia: 19, tipoImovel: 'Terreno', etapa: 2, diasCadastro: 90 },
  { nome: 'Ivone Aparecida da Silva', cpf: '91572836482', nascimento: '30/06/1955', telefone: '49985667788', email: null, estadoCivil: 'Divorciado(a)', municipio: 'Itá', bairro: 'Bela Vista', rua: 'Rua do Lago', numero: '12', anosMoradia: 23, tipoImovel: 'Casa', etapa: 4, diasCadastro: 180 },
  { nome: 'Pedro Paulo Machado', cpf: '24861057353', nascimento: '09/09/1968', telefone: '49991233210', email: 'pedro.machado@example.com', estadoCivil: 'União estável', municipio: 'Chapecó', bairro: 'Efapi', rua: 'Rua das Acácias', numero: '958', anosMoradia: 12, tipoImovel: 'Casa', etapa: 1, diasCadastro: 8 },
  { nome: 'Neusa Maria Klein', cpf: '68035729195', nascimento: '14/02/1947', telefone: '49984002271', email: null, estadoCivil: 'Viúvo(a)', municipio: 'Piratuba', bairro: 'Centro', rua: 'Rua das Termas', numero: '230', anosMoradia: 38, tipoImovel: 'Casa', etapa: 6, diasCadastro: 260 },
  { nome: 'José Francisco de Souza', cpf: '12345678909', nascimento: '25/05/1959', telefone: '49985031080', email: 'jose.souza@example.com', estadoCivil: 'Casado(a)', municipio: 'Concórdia', bairro: 'Santa Cruz', rua: 'Avenida Salgado Filho', numero: '780', anosMoradia: 21, tipoImovel: 'Casa', etapa: 3, diasCadastro: 45 },
];

function situacaoDocumentoPara(etapa: number, indiceDoc: number): SituacaoDocumento {
  // Quanto mais avançado o processo, mais documentos aprovados.
  if (etapa >= 4) return indiceDoc <= 3 ? 'aprovado' : 'recebido';
  if (etapa === 3) return indiceDoc <= 2 ? 'aprovado' : indiceDoc <= 4 ? 'recebido' : 'pendente';
  if (etapa === 2) return indiceDoc <= 1 ? 'recebido' : 'pendente';
  return 'pendente';
}

function semear(): Banco {
  const banco: Banco = {
    moradores: [],
    atualizacoes: [],
    documentos: [],
    notas: [],
    admins: [],
    comunicados: [],
    mensagens: [],
    inscricoesPush: [],
    modeloComunicado: { ...MODELO_COMUNICADO_PADRAO },
    seq: {
      morador: 0,
      atualizacao: 0,
      documento: 0,
      nota: 0,
      admin: 0,
      comunicado: 0,
      mensagem: 0,
      inscricao: 0,
    },
  };

  // Primeiro administrador (mesma regra do banco real). Se a senha veio das
  // variáveis de ambiente, ela não é a senha padrão pública — sem aviso de troca.
  const emailAdmin = process.env.ADMIN_EMAIL || 'admin@adehasc.com.br';
  const senhaAdmin = process.env.ADMIN_PASSWORD || 'adehasc2026';
  banco.admins.push({
    id: ++banco.seq.admin,
    name: 'Equipe ADEHASC',
    email: emailAdmin.toLowerCase(),
    password_hash: bcrypt.hashSync(senhaAdmin, 10),
    password_changed: !!process.env.ADMIN_PASSWORD,
    created_at: agoraIso(),
  });

  const hashDemonstracao = bcrypt.hashSync(SENHA_DEMONSTRACAO, 10);

  for (const s of SEMENTES) {
    const id = ++banco.seq.morador;
    const criadoEm = diasAtras(s.diasCadastro);
    const morador: Morador = {
      id,
      protocol: gerarProtocolo(id, criadoEm),
      full_name: s.nome,
      cpf: s.cpf,
      birth_date: s.nascimento,
      phone: s.telefone,
      email: s.email,
      marital_status: s.estadoCivil,
      city: s.municipio,
      neighborhood: s.bairro,
      street: s.rua,
      number: s.numero,
      complement: null,
      years_living: s.anosMoradia,
      property_type: s.tipoImovel,
      password_hash: hashDemonstracao,
      stage: s.etapa,
      must_change: false,
      created_at: criadoEm,
      updated_at: criadoEm,
    };
    banco.moradores.push(morador);

    // Linha do tempo coerente com a etapa atual.
    const intervalo = Math.max(Math.floor(s.diasCadastro / (s.etapa + 1)), 1);
    for (let e = 1; e <= s.etapa; e++) {
      banco.atualizacoes.push({
        id: ++banco.seq.atualizacao,
        resident_id: id,
        message: etapaInfo(e).texto,
        stage: e,
        author: 'Equipe ADEHASC',
        created_at: diasAtras(s.diasCadastro - intervalo * (e - 1)),
      });
    }

    DOCUMENTOS_PADRAO.forEach((nomeDoc, i) => {
      banco.documentos.push({
        id: ++banco.seq.documento,
        resident_id: id,
        name: nomeDoc,
        status: situacaoDocumentoPara(s.etapa, i),
        updated_at: diasAtras(Math.max(s.diasCadastro - 10, 0)),
      });
    });
  }

  // Um aviso extra para deixar a demonstração mais realista.
  const teste = banco.moradores.find((m) => m.cpf === '12345678909');
  if (teste) {
    banco.atualizacoes.push({
      id: ++banco.seq.atualizacao,
      resident_id: teste.id,
      message: 'A vistoria do seu imóvel ficou agendada. Nossa equipe entra em contato para combinar o melhor horário.',
      stage: null,
      author: 'Equipe ADEHASC',
      created_at: diasAtras(2),
    });
    banco.mensagens.push(
      {
        id: ++banco.seq.mensagem,
        resident_id: teste.id,
        sender: 'morador',
        text: 'Boa tarde! Queria saber se preciso levar o carnê do IPTU na vistoria.',
        read_by_admin: true,
        read_by_resident: true,
        created_at: diasAtras(3),
      },
      {
        id: ++banco.seq.mensagem,
        resident_id: teste.id,
        sender: 'equipe',
        text: 'Boa tarde, José! Pode deixar o carnê separado em casa que a nossa equipe confere no dia. Qualquer coisa, estamos por aqui.',
        read_by_admin: true,
        read_by_resident: false,
        created_at: diasAtras(3),
      }
    );
    banco.comunicados.push({
      id: ++banco.seq.comunicado,
      batch_id: 'demonstracao-1',
      resident_id: teste.id,
      title: 'Mutirão de atendimento em Concórdia',
      body:
        `Olá, ${teste.full_name}!\n\n` +
        `No próximo sábado faremos um mutirão de atendimento na sede da ADEHASC ` +
        `(Avenida Salgado Filho, nº 559, Centro), das 9h às 16h.\n\n` +
        `Traga os seus documentos pendentes — nossa equipe confere tudo na hora.\n\n` +
        `Qualquer dúvida, ligue para a gente: (49) 3622-3137.\n\nCom carinho,\nEquipe ADEHASC`,
      author: 'Equipe ADEHASC',
      created_at: diasAtras(5),
    });
  }

  return banco;
}

function banco(): Banco {
  const g = globalThis as { __adehascBancoDemo?: Banco };
  if (!g.__adehascBancoDemo) g.__adehascBancoDemo = semear();
  return g.__adehascBancoDemo;
}

function ordenarRecentes(lista: Morador[]): Morador[] {
  return [...lista].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export const dadosMemoria: Dados = {
  async init() {
    banco();
  },

  async criarMorador(dados: NovoMorador): Promise<Morador> {
    const b = banco();
    // Mesma garantia do UNIQUE(cpf) do Postgres.
    if (b.moradores.some((m) => m.cpf === dados.cpf)) throw new ErroDuplicado('cpf');
    const id = ++b.seq.morador;
    const agora = agoraIso();
    const morador: Morador = {
      id,
      protocol: gerarProtocolo(id, agora),
      ...dados,
      stage: 1,
      must_change: false,
      created_at: agora,
      updated_at: agora,
    };
    b.moradores.push(morador);
    DOCUMENTOS_PADRAO.forEach((nomeDoc) => {
      b.documentos.push({
        id: ++b.seq.documento,
        resident_id: id,
        name: nomeDoc,
        status: 'pendente',
        updated_at: agora,
      });
    });
    b.atualizacoes.push({
      id: ++b.seq.atualizacao,
      resident_id: id,
      message: etapaInfo(1).texto,
      stage: 1,
      author: 'Equipe ADEHASC',
      created_at: agora,
    });
    return morador;
  },

  async moradorPorCpf(cpf: string): Promise<Morador | null> {
    return banco().moradores.find((m) => m.cpf === cpf) || null;
  },

  async moradorPorId(id: number): Promise<Morador | null> {
    return banco().moradores.find((m) => m.id === id) || null;
  },

  async atualizarMorador(id: number, campos: CamposMorador): Promise<Morador | null> {
    const morador = banco().moradores.find((m) => m.id === id);
    if (!morador) return null;
    Object.assign(morador, campos, { updated_at: agoraIso() });
    return morador;
  },

  async definirSenhaMorador(id: number, hash: string, deveTrocar: boolean): Promise<void> {
    const morador = banco().moradores.find((m) => m.id === id);
    if (morador) {
      morador.password_hash = hash;
      morador.must_change = deveTrocar;
      morador.updated_at = agoraIso();
    }
  },

  async excluirMorador(id: number): Promise<boolean> {
    const b = banco();
    const antes = b.moradores.length;
    b.moradores = b.moradores.filter((m) => m.id !== id);
    b.atualizacoes = b.atualizacoes.filter((a) => a.resident_id !== id);
    b.documentos = b.documentos.filter((d) => d.resident_id !== id);
    b.notas = b.notas.filter((n) => n.resident_id !== id);
    return b.moradores.length < antes;
  },

  async listarMoradores(f: FiltroMoradores) {
    let lista = ordenarRecentes(banco().moradores);
    const q = (f.q || '').trim().toLowerCase();
    if (q) {
      const digitos = q.replace(/\D/g, '');
      lista = lista.filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          m.protocol.toLowerCase().includes(q) ||
          (digitos.length > 0 && m.cpf.includes(digitos))
      );
    }
    if (f.etapa) lista = lista.filter((m) => m.stage === f.etapa);
    if (f.municipio) lista = lista.filter((m) => m.city === f.municipio);
    const total = lista.length;
    const inicio = (f.pagina - 1) * f.porPagina;
    return { moradores: lista.slice(inicio, inicio + f.porPagina), total };
  },

  async listarMunicipios(): Promise<string[]> {
    return [...new Set(banco().moradores.map((m) => m.city))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR')
    );
  },

  async todosMoradores(): Promise<Morador[]> {
    return ordenarRecentes(banco().moradores);
  },

  async estatisticas(): Promise<Estatisticas> {
    const b = banco();
    const limite30 = diasAtras(30);
    const porEtapa = [0, 0, 0, 0, 0, 0, 0];
    for (const m of b.moradores) {
      if (m.stage >= 1 && m.stage <= 7) porEtapa[m.stage - 1] += 1;
    }
    return {
      total: b.moradores.length,
      emAndamento: b.moradores.filter((m) => m.stage < 7).length,
      concluidos: b.moradores.filter((m) => m.stage === 7).length,
      novos30: b.moradores.filter((m) => m.created_at >= limite30).length,
      porEtapa,
      ultimos: ordenarRecentes(b.moradores).slice(0, 6),
      senhaAdminPadraoPendente: b.admins.some((a) => !a.password_changed),
    };
  },

  async adicionarAtualizacao(moradorId, mensagem, etapa, autor = 'Equipe ADEHASC') {
    const b = banco();
    const atualizacao: Atualizacao = {
      id: ++b.seq.atualizacao,
      resident_id: moradorId,
      message: mensagem,
      stage: etapa,
      author: autor,
      created_at: agoraIso(),
    };
    b.atualizacoes.push(atualizacao);
    return atualizacao;
  },

  async listarAtualizacoes(moradorId: number): Promise<Atualizacao[]> {
    return banco()
      .atualizacoes.filter((a) => a.resident_id === moradorId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  },

  async listarDocumentos(moradorId: number): Promise<Documento[]> {
    return banco()
      .documentos.filter((d) => d.resident_id === moradorId)
      .sort((a, b) => a.id - b.id);
  },

  async atualizarDocumento(moradorId, documentoId, situacao) {
    const documento = banco().documentos.find(
      (d) => d.id === documentoId && d.resident_id === moradorId
    );
    if (!documento) return null;
    documento.status = situacao;
    documento.updated_at = agoraIso();
    return documento;
  },

  async adicionarNota(moradorId: number, texto: string): Promise<Nota> {
    const b = banco();
    const nota: Nota = {
      id: ++b.seq.nota,
      resident_id: moradorId,
      text: texto,
      created_at: agoraIso(),
    };
    b.notas.push(nota);
    return nota;
  },

  async listarNotas(moradorId: number): Promise<Nota[]> {
    return banco()
      .notas.filter((n) => n.resident_id === moradorId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  },

  async adminPorEmail(email: string): Promise<Admin | null> {
    return banco().admins.find((a) => a.email === email.toLowerCase()) || null;
  },

  async adminPorId(id: number): Promise<Admin | null> {
    return banco().admins.find((a) => a.id === id) || null;
  },

  async criarAdmin(nome, email, hash, senhaTrocada): Promise<Admin> {
    const b = banco();
    // Mesma garantia do UNIQUE(email) do Postgres.
    if (b.admins.some((a) => a.email === email.toLowerCase())) throw new ErroDuplicado('email');
    const admin: Admin = {
      id: ++b.seq.admin,
      name: nome,
      email: email.toLowerCase(),
      password_hash: hash,
      password_changed: senhaTrocada,
      created_at: agoraIso(),
    };
    b.admins.push(admin);
    return admin;
  },

  async listarAdmins(): Promise<Admin[]> {
    return [...banco().admins].sort((a, b) => a.id - b.id);
  },

  async definirSenhaAdmin(id: number, hash: string): Promise<void> {
    const admin = banco().admins.find((a) => a.id === id);
    if (admin) {
      admin.password_hash = hash;
      admin.password_changed = true;
    }
  },

  async enviarMensagem(moradorId, remetente, texto): Promise<Mensagem> {
    const b = banco();
    const mensagem: Mensagem = {
      id: ++b.seq.mensagem,
      resident_id: moradorId,
      sender: remetente,
      text: texto,
      read_by_admin: remetente === 'equipe',
      read_by_resident: remetente === 'morador',
      created_at: agoraIso(),
    };
    b.mensagens.push(mensagem);
    return mensagem;
  },

  async listarMensagens(moradorId: number): Promise<Mensagem[]> {
    return banco()
      .mensagens.filter((m) => m.resident_id === moradorId)
      .sort((a, b) =>
        a.created_at === b.created_at ? a.id - b.id : a.created_at > b.created_at ? 1 : -1
      );
  },

  async marcarMensagensLidas(moradorId: number, por: RemetenteMensagem): Promise<void> {
    for (const mensagem of banco().mensagens) {
      if (mensagem.resident_id !== moradorId) continue;
      if (por === 'equipe' && mensagem.sender === 'morador') mensagem.read_by_admin = true;
      if (por === 'morador' && mensagem.sender === 'equipe') mensagem.read_by_resident = true;
    }
  },

  async listarConversas(): Promise<Conversa[]> {
    const b = banco();
    const porMorador = new Map<number, Mensagem[]>();
    for (const mensagem of b.mensagens) {
      const lista = porMorador.get(mensagem.resident_id) || [];
      lista.push(mensagem);
      porMorador.set(mensagem.resident_id, lista);
    }
    const conversas: Conversa[] = [];
    for (const [moradorId, mensagens] of porMorador) {
      const morador = b.moradores.find((m) => m.id === moradorId);
      if (!morador) continue;
      const ordenadas = [...mensagens].sort((a, b) => (a.created_at > b.created_at ? 1 : -1));
      const ultima = ordenadas[ordenadas.length - 1];
      conversas.push({
        resident_id: moradorId,
        nome: morador.full_name,
        protocolo: morador.protocol,
        ultima_mensagem: ultima.text,
        remetente_ultima: ultima.sender,
        ultima_em: ultima.created_at,
        nao_lidas: mensagens.filter((m) => m.sender === 'morador' && !m.read_by_admin).length,
      });
    }
    return conversas.sort((a, b) => (a.ultima_em < b.ultima_em ? 1 : -1));
  },

  async salvarInscricaoPush(moradorId, endpoint, p256dh, auth): Promise<void> {
    const b = banco();
    const existente = b.inscricoesPush.find((i) => i.endpoint === endpoint);
    if (existente) {
      existente.resident_id = moradorId;
      existente.p256dh = p256dh;
      existente.auth = auth;
      return;
    }
    b.inscricoesPush.push({
      id: ++b.seq.inscricao,
      resident_id: moradorId,
      endpoint,
      p256dh,
      auth,
      created_at: agoraIso(),
    });
  },

  async removerInscricaoPush(endpoint: string): Promise<void> {
    const b = banco();
    b.inscricoesPush = b.inscricoesPush.filter((i) => i.endpoint !== endpoint);
  },

  async listarInscricoesPush(moradorId: number): Promise<InscricaoPush[]> {
    return banco().inscricoesPush.filter((i) => i.resident_id === moradorId);
  },

  async obterModeloComunicado(): Promise<ModeloComunicado> {
    return { ...banco().modeloComunicado };
  },

  async salvarModeloComunicado(modelo: ModeloComunicado): Promise<void> {
    banco().modeloComunicado = { ...modelo };
  },

  async criarComunicado(moradorId, loteId, titulo, corpo): Promise<Comunicado> {
    const b = banco();
    const comunicado: Comunicado = {
      id: ++b.seq.comunicado,
      batch_id: loteId,
      resident_id: moradorId,
      title: titulo,
      body: corpo,
      author: 'Equipe ADEHASC',
      created_at: agoraIso(),
    };
    b.comunicados.push(comunicado);
    return comunicado;
  },

  async listarComunicadosDoMorador(moradorId: number): Promise<Comunicado[]> {
    return banco()
      .comunicados.filter((c) => c.resident_id === moradorId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  },

  async listarLotesComunicados(): Promise<LoteComunicado[]> {
    const lotes = new Map<string, LoteComunicado>();
    for (const c of banco().comunicados) {
      const lote = lotes.get(c.batch_id);
      if (lote) {
        lote.total += 1;
        if (c.created_at < lote.criado_em) lote.criado_em = c.created_at;
      } else {
        lotes.set(c.batch_id, {
          lote_id: c.batch_id,
          titulo: c.title,
          criado_em: c.created_at,
          total: 1,
        });
      }
    }
    return [...lotes.values()]
      .sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1))
      .slice(0, 50);
  },
};
