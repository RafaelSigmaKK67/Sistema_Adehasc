// Implementação Postgres (Neon via Vercel) — tabelas criadas automaticamente na primeira execução.

import { Pool, PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import { urlBanco } from '@/lib/ambiente';
import { DOCUMENTOS_PADRAO, etapaInfo } from '@/lib/etapas';
import {
  Admin,
  Anexo,
  Atualizacao,
  CamposMorador,
  Comunicado,
  Conversa,
  Dados,
  Documento,
  Estatisticas,
  FiltroMoradores,
  InscricaoPush,
  LoteComunicado,
  MODELO_COMUNICADO_PADRAO,
  Mensagem,
  ModeloComunicado,
  Morador,
  Nota,
  NovoAnexo,
  NovoMorador,
  RemetenteMensagem,
  gerarProtocolo,
} from '@/lib/store';

function criarPool(): Pool {
  const url = urlBanco();
  if (!url) throw new Error('Banco de dados não configurado.');
  // Decide o SSL pelo hostname de verdade (uma senha contendo "localhost" não conta).
  let local = false;
  try {
    const hostname = new URL(url).hostname;
    local = hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  }
  return new Pool({
    connectionString: url,
    ssl: local ? undefined : { rejectUnauthorized: false },
    max: 3,
  });
}

function pool(): Pool {
  const g = globalThis as { __adehascPool?: Pool };
  if (!g.__adehascPool) g.__adehascPool = criarPool();
  return g.__adehascPool;
}

function iso(valor: unknown): string {
  if (valor instanceof Date) return valor.toISOString();
  return String(valor ?? '');
}

type Linha = Record<string, unknown>;

function paraMorador(linha: Linha): Morador {
  return {
    id: Number(linha.id),
    protocol: String(linha.protocol ?? ''),
    full_name: String(linha.full_name ?? ''),
    cpf: String(linha.cpf ?? ''),
    birth_date: (linha.birth_date as string | null) ?? null,
    phone: String(linha.phone ?? ''),
    email: (linha.email as string | null) ?? null,
    marital_status: (linha.marital_status as string | null) ?? null,
    city: String(linha.city ?? ''),
    neighborhood: (linha.neighborhood as string | null) ?? null,
    street: (linha.street as string | null) ?? null,
    number: (linha.number as string | null) ?? null,
    complement: (linha.complement as string | null) ?? null,
    years_living: linha.years_living === null || linha.years_living === undefined ? null : Number(linha.years_living),
    property_type: (linha.property_type as string | null) ?? null,
    password_hash: String(linha.password_hash ?? ''),
    stage: Number(linha.stage ?? 1),
    must_change: Boolean(linha.must_change),
    created_at: iso(linha.created_at),
    updated_at: iso(linha.updated_at),
  };
}

function paraAtualizacao(linha: Linha): Atualizacao {
  return {
    id: Number(linha.id),
    resident_id: Number(linha.resident_id),
    message: String(linha.message ?? ''),
    stage: linha.stage === null || linha.stage === undefined ? null : Number(linha.stage),
    author: String(linha.author ?? 'Equipe ADEHASC'),
    created_at: iso(linha.created_at),
  };
}

function paraDocumento(linha: Linha): Documento {
  return {
    id: Number(linha.id),
    resident_id: Number(linha.resident_id),
    name: String(linha.name ?? ''),
    status: (String(linha.status ?? 'pendente') as Documento['status']),
    updated_at: iso(linha.updated_at),
  };
}

function paraNota(linha: Linha): Nota {
  return {
    id: Number(linha.id),
    resident_id: Number(linha.resident_id),
    text: String(linha.text ?? ''),
    created_at: iso(linha.created_at),
  };
}

function paraMensagem(linha: Linha): Mensagem {
  return {
    id: Number(linha.id),
    resident_id: Number(linha.resident_id),
    sender: (String(linha.sender ?? 'morador') as RemetenteMensagem),
    text: String(linha.text ?? ''),
    read_by_admin: Boolean(linha.read_by_admin),
    read_by_resident: Boolean(linha.read_by_resident),
    created_at: iso(linha.created_at),
    anexo:
      linha.anexo_id === null || linha.anexo_id === undefined
        ? null
        : {
            id: Number(linha.anexo_id),
            nome: String(linha.anexo_nome ?? 'arquivo'),
            mime: String(linha.anexo_mime ?? 'application/octet-stream'),
            tamanho: Number(linha.anexo_tamanho ?? 0),
          },
  };
}

function paraComunicado(linha: Linha): Comunicado {
  return {
    id: Number(linha.id),
    batch_id: String(linha.batch_id ?? ''),
    resident_id: Number(linha.resident_id),
    title: String(linha.title ?? ''),
    body: String(linha.body ?? ''),
    author: String(linha.author ?? 'Equipe ADEHASC'),
    created_at: iso(linha.created_at),
  };
}

function paraAdmin(linha: Linha): Admin {
  return {
    id: Number(linha.id),
    name: String(linha.name ?? ''),
    email: String(linha.email ?? ''),
    password_hash: String(linha.password_hash ?? ''),
    password_changed: Boolean(linha.password_changed),
    created_at: iso(linha.created_at),
  };
}

async function criarTabelas(): Promise<void> {
  const p = pool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS residents (
      id serial PRIMARY KEY,
      protocol text UNIQUE,
      full_name text NOT NULL,
      cpf text UNIQUE NOT NULL,
      birth_date text,
      phone text NOT NULL,
      email text,
      marital_status text,
      city text NOT NULL,
      neighborhood text,
      street text,
      "number" text,
      complement text,
      years_living int,
      property_type text,
      password_hash text NOT NULL,
      stage int NOT NULL DEFAULT 1,
      must_change boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS updates (
      id serial PRIMARY KEY,
      resident_id int NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
      message text NOT NULL,
      stage int,
      author text NOT NULL DEFAULT 'Equipe ADEHASC',
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id serial PRIMARY KEY,
      resident_id int NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
      name text NOT NULL,
      status text NOT NULL DEFAULT 'pendente',
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id serial PRIMARY KEY,
      resident_id int NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
      text text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id serial PRIMARY KEY,
      name text NOT NULL,
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      password_changed boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id serial PRIMARY KEY,
      batch_id text NOT NULL,
      resident_id int NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
      title text NOT NULL,
      body text NOT NULL,
      author text NOT NULL DEFAULT 'Equipe ADEHASC',
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key text PRIMARY KEY,
      value text NOT NULL
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id serial PRIMARY KEY,
      resident_id int NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
      sender text NOT NULL,
      text text NOT NULL,
      read_by_admin boolean NOT NULL DEFAULT false,
      read_by_resident boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS attachments (
      id serial PRIMARY KEY,
      message_id int NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      resident_id int NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
      filename text NOT NULL,
      mime text NOT NULL,
      size int NOT NULL,
      data_base64 text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id serial PRIMARY KEY,
      resident_id int NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
      endpoint text UNIQUE NOT NULL,
      p256dh text NOT NULL,
      auth text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await p.query('CREATE INDEX IF NOT EXISTS idx_updates_resident ON updates(resident_id);');
  await p.query('CREATE INDEX IF NOT EXISTS idx_documents_resident ON documents(resident_id);');
  await p.query('CREATE INDEX IF NOT EXISTS idx_residents_created ON residents(created_at);');
  await p.query('CREATE INDEX IF NOT EXISTS idx_announcements_resident ON announcements(resident_id);');
  await p.query('CREATE INDEX IF NOT EXISTS idx_messages_resident ON messages(resident_id);');
  await p.query('CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id);');
  await p.query('CREATE INDEX IF NOT EXISTS idx_push_resident ON push_subscriptions(resident_id);');

  // Primeiro administrador na primeira execução. Se a senha veio das variáveis
  // de ambiente, ela não é a senha padrão pública — sem aviso de troca.
  const existentes = await p.query('SELECT count(*)::int AS total FROM admins');
  if (existentes.rows[0].total === 0) {
    const email = (process.env.ADMIN_EMAIL || 'admin@adehasc.com.br').toLowerCase();
    const senha = process.env.ADMIN_PASSWORD || 'adehasc2026';
    const hash = await bcrypt.hash(senha, 10);
    await p.query(
      `INSERT INTO admins (name, email, password_hash, password_changed)
       VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
      ['Equipe ADEHASC', email, hash, !!process.env.ADMIN_PASSWORD]
    );
  }
}

/** Trata %, _ e \ como texto comum na busca (mesmo comportamento do modo demonstração). */
function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, '\\$&');
}

function filtroSql(f: FiltroMoradores): { where: string; valores: unknown[] } {
  const condicoes: string[] = [];
  const valores: unknown[] = [];
  const q = (f.q || '').trim();
  if (q) {
    valores.push(`%${escaparLike(q)}%`);
    const partes = [
      `full_name ILIKE $${valores.length} ESCAPE '\\'`,
      `protocol ILIKE $${valores.length} ESCAPE '\\'`,
    ];
    const digitos = q.replace(/\D/g, '');
    if (digitos) {
      valores.push(`%${digitos}%`);
      partes.push(`cpf LIKE $${valores.length}`);
    }
    condicoes.push(`(${partes.join(' OR ')})`);
  }
  if (f.etapa) {
    valores.push(f.etapa);
    condicoes.push(`stage = $${valores.length}`);
  }
  if (f.municipio) {
    valores.push(f.municipio);
    condicoes.push(`city = $${valores.length}`);
  }
  return { where: condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '', valores };
}

async function comTransacao<T>(fn: (cliente: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await pool().connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await fn(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}

let inicializado: Promise<void> | null = null;

export const dadosPostgres: Dados = {
  async init() {
    if (!inicializado) {
      inicializado = criarTabelas().catch((erro) => {
        inicializado = null;
        throw erro;
      });
    }
    await inicializado;
  },

  async criarMorador(dados: NovoMorador): Promise<Morador> {
    return comTransacao(async (cliente) => {
      const inserido = await cliente.query(
        `INSERT INTO residents
           (full_name, cpf, birth_date, phone, email, marital_status, city, neighborhood,
            street, "number", complement, years_living, property_type, password_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [
          dados.full_name,
          dados.cpf,
          dados.birth_date,
          dados.phone,
          dados.email,
          dados.marital_status,
          dados.city,
          dados.neighborhood,
          dados.street,
          dados.number,
          dados.complement,
          dados.years_living,
          dados.property_type,
          dados.password_hash,
        ]
      );
      const linha = inserido.rows[0];
      const protocolo = gerarProtocolo(Number(linha.id), iso(linha.created_at));
      const atualizado = await cliente.query(
        'UPDATE residents SET protocol = $1 WHERE id = $2 RETURNING *',
        [protocolo, linha.id]
      );
      for (const nomeDoc of DOCUMENTOS_PADRAO) {
        await cliente.query(
          `INSERT INTO documents (resident_id, name, status) VALUES ($1, $2, 'pendente')`,
          [linha.id, nomeDoc]
        );
      }
      await cliente.query(
        `INSERT INTO updates (resident_id, message, stage) VALUES ($1, $2, 1)`,
        [linha.id, etapaInfo(1).texto]
      );
      return paraMorador(atualizado.rows[0]);
    });
  },

  async moradorPorCpf(cpf: string): Promise<Morador | null> {
    const r = await pool().query('SELECT * FROM residents WHERE cpf = $1', [cpf]);
    return r.rows[0] ? paraMorador(r.rows[0]) : null;
  },

  async moradorPorId(id: number): Promise<Morador | null> {
    const r = await pool().query('SELECT * FROM residents WHERE id = $1', [id]);
    return r.rows[0] ? paraMorador(r.rows[0]) : null;
  },

  async atualizarMorador(id: number, campos: CamposMorador): Promise<Morador | null> {
    const chaves = Object.keys(campos) as (keyof CamposMorador)[];
    if (chaves.length === 0) return this.moradorPorId(id);
    const definicoes: string[] = [];
    const valores: unknown[] = [];
    for (const chave of chaves) {
      valores.push(campos[chave]);
      definicoes.push(`"${chave}" = $${valores.length}`);
    }
    valores.push(id);
    const r = await pool().query(
      `UPDATE residents SET ${definicoes.join(', ')}, updated_at = now()
       WHERE id = $${valores.length} RETURNING *`,
      valores
    );
    return r.rows[0] ? paraMorador(r.rows[0]) : null;
  },

  async definirSenhaMorador(id: number, hash: string, deveTrocar: boolean): Promise<void> {
    await pool().query(
      'UPDATE residents SET password_hash = $1, must_change = $2, updated_at = now() WHERE id = $3',
      [hash, deveTrocar, id]
    );
  },

  async excluirMorador(id: number): Promise<boolean> {
    const r = await pool().query('DELETE FROM residents WHERE id = $1', [id]);
    return (r.rowCount ?? 0) > 0;
  },

  async listarMoradores(f: FiltroMoradores) {
    const { where, valores } = filtroSql(f);
    const totalR = await pool().query(
      `SELECT count(*)::int AS total FROM residents ${where}`,
      valores
    );
    const valoresPagina = [...valores, f.porPagina, (f.pagina - 1) * f.porPagina];
    const linhas = await pool().query(
      `SELECT * FROM residents ${where}
       ORDER BY created_at DESC
       LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
      valoresPagina
    );
    return { moradores: linhas.rows.map(paraMorador), total: totalR.rows[0].total };
  },

  async listarMunicipios(): Promise<string[]> {
    const r = await pool().query('SELECT DISTINCT city FROM residents');
    // Ordena em pt-BR no JavaScript (a collation padrão do banco ordena acentos errado).
    return r.rows.map((linha) => String(linha.city)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  },

  async todosMoradores(): Promise<Morador[]> {
    const r = await pool().query('SELECT * FROM residents ORDER BY created_at DESC');
    return r.rows.map(paraMorador);
  },

  async estatisticas(): Promise<Estatisticas> {
    const p = pool();
    const [total, andamento, concluidos, novos, porEtapaR, ultimos, senhaPadrao] =
      await Promise.all([
        p.query('SELECT count(*)::int AS n FROM residents'),
        p.query('SELECT count(*)::int AS n FROM residents WHERE stage < 7'),
        p.query('SELECT count(*)::int AS n FROM residents WHERE stage = 7'),
        p.query(`SELECT count(*)::int AS n FROM residents WHERE created_at > now() - interval '30 days'`),
        p.query('SELECT stage, count(*)::int AS n FROM residents GROUP BY stage'),
        p.query('SELECT * FROM residents ORDER BY created_at DESC LIMIT 6'),
        p.query('SELECT count(*)::int AS n FROM admins WHERE password_changed = false'),
      ]);
    const porEtapa = [0, 0, 0, 0, 0, 0, 0];
    for (const linha of porEtapaR.rows) {
      const etapa = Number(linha.stage);
      if (etapa >= 1 && etapa <= 7) porEtapa[etapa - 1] = Number(linha.n);
    }
    return {
      total: total.rows[0].n,
      emAndamento: andamento.rows[0].n,
      concluidos: concluidos.rows[0].n,
      novos30: novos.rows[0].n,
      porEtapa,
      ultimos: ultimos.rows.map(paraMorador),
      senhaAdminPadraoPendente: senhaPadrao.rows[0].n > 0,
    };
  },

  async adicionarAtualizacao(moradorId, mensagem, etapa, autor = 'Equipe ADEHASC') {
    const r = await pool().query(
      `INSERT INTO updates (resident_id, message, stage, author)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [moradorId, mensagem, etapa, autor]
    );
    return paraAtualizacao(r.rows[0]);
  },

  async listarAtualizacoes(moradorId: number): Promise<Atualizacao[]> {
    const r = await pool().query(
      'SELECT * FROM updates WHERE resident_id = $1 ORDER BY created_at DESC, id DESC',
      [moradorId]
    );
    return r.rows.map(paraAtualizacao);
  },

  async listarDocumentos(moradorId: number): Promise<Documento[]> {
    const r = await pool().query(
      'SELECT * FROM documents WHERE resident_id = $1 ORDER BY id',
      [moradorId]
    );
    return r.rows.map(paraDocumento);
  },

  async atualizarDocumento(moradorId, documentoId, situacao) {
    const r = await pool().query(
      `UPDATE documents SET status = $1, updated_at = now()
       WHERE id = $2 AND resident_id = $3 RETURNING *`,
      [situacao, documentoId, moradorId]
    );
    return r.rows[0] ? paraDocumento(r.rows[0]) : null;
  },

  async adicionarNota(moradorId: number, texto: string): Promise<Nota> {
    const r = await pool().query(
      'INSERT INTO notes (resident_id, text) VALUES ($1, $2) RETURNING *',
      [moradorId, texto]
    );
    return paraNota(r.rows[0]);
  },

  async listarNotas(moradorId: number): Promise<Nota[]> {
    const r = await pool().query(
      'SELECT * FROM notes WHERE resident_id = $1 ORDER BY created_at DESC, id DESC',
      [moradorId]
    );
    return r.rows.map(paraNota);
  },

  async adminPorEmail(email: string): Promise<Admin | null> {
    const r = await pool().query('SELECT * FROM admins WHERE email = $1', [email.toLowerCase()]);
    return r.rows[0] ? paraAdmin(r.rows[0]) : null;
  },

  async adminPorId(id: number): Promise<Admin | null> {
    const r = await pool().query('SELECT * FROM admins WHERE id = $1', [id]);
    return r.rows[0] ? paraAdmin(r.rows[0]) : null;
  },

  async criarAdmin(nome, email, hash, senhaTrocada): Promise<Admin> {
    const r = await pool().query(
      `INSERT INTO admins (name, email, password_hash, password_changed)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nome, email.toLowerCase(), hash, senhaTrocada]
    );
    return paraAdmin(r.rows[0]);
  },

  async listarAdmins(): Promise<Admin[]> {
    const r = await pool().query('SELECT * FROM admins ORDER BY id');
    return r.rows.map(paraAdmin);
  },

  async definirSenhaAdmin(id: number, hash: string): Promise<void> {
    await pool().query(
      'UPDATE admins SET password_hash = $1, password_changed = true WHERE id = $2',
      [hash, id]
    );
  },

  async enviarMensagem(moradorId, remetente, texto, anexo?: NovoAnexo): Promise<Mensagem> {
    return comTransacao(async (cliente) => {
      const inserida = await cliente.query(
        `INSERT INTO messages (resident_id, sender, text, read_by_admin, read_by_resident)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [moradorId, remetente, texto, remetente === 'equipe', remetente === 'morador']
      );
      const linha = inserida.rows[0];
      if (anexo) {
        const anexoInserido = await cliente.query(
          `INSERT INTO attachments (message_id, resident_id, filename, mime, size, data_base64)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [linha.id, moradorId, anexo.nome, anexo.mime, anexo.tamanho, anexo.dados_base64]
        );
        linha.anexo_id = anexoInserido.rows[0].id;
        linha.anexo_nome = anexo.nome;
        linha.anexo_mime = anexo.mime;
        linha.anexo_tamanho = anexo.tamanho;
      }
      return paraMensagem(linha);
    });
  },

  async obterAnexo(anexoId: number): Promise<Anexo | null> {
    const r = await pool().query('SELECT * FROM attachments WHERE id = $1', [anexoId]);
    if (!r.rows[0]) return null;
    const linha = r.rows[0];
    return {
      id: Number(linha.id),
      resident_id: Number(linha.resident_id),
      nome: String(linha.filename ?? 'arquivo'),
      mime: String(linha.mime ?? 'application/octet-stream'),
      tamanho: Number(linha.size ?? 0),
      dados_base64: String(linha.data_base64 ?? ''),
    };
  },

  async listarMensagens(moradorId: number): Promise<Mensagem[]> {
    const r = await pool().query(
      `SELECT m.*, a.id AS anexo_id, a.filename AS anexo_nome, a.mime AS anexo_mime, a.size AS anexo_tamanho
       FROM messages m
       LEFT JOIN attachments a ON a.message_id = m.id
       WHERE m.resident_id = $1
       ORDER BY m.created_at, m.id`,
      [moradorId]
    );
    return r.rows.map(paraMensagem);
  },

  async marcarMensagensLidas(moradorId: number, por: RemetenteMensagem): Promise<void> {
    if (por === 'equipe') {
      await pool().query(
        `UPDATE messages SET read_by_admin = true WHERE resident_id = $1 AND sender = 'morador'`,
        [moradorId]
      );
    } else {
      await pool().query(
        `UPDATE messages SET read_by_resident = true WHERE resident_id = $1 AND sender = 'equipe'`,
        [moradorId]
      );
    }
  },

  async listarConversas(): Promise<Conversa[]> {
    const r = await pool().query(`
      SELECT r.id AS resident_id, r.full_name, r.protocol,
        (SELECT text FROM messages WHERE resident_id = r.id ORDER BY created_at DESC, id DESC LIMIT 1) AS ultima,
        (SELECT sender FROM messages WHERE resident_id = r.id ORDER BY created_at DESC, id DESC LIMIT 1) AS remetente,
        (SELECT created_at FROM messages WHERE resident_id = r.id ORDER BY created_at DESC, id DESC LIMIT 1) AS ultima_em,
        (SELECT count(*)::int FROM messages WHERE resident_id = r.id AND sender = 'morador' AND NOT read_by_admin) AS nao_lidas
      FROM residents r
      WHERE EXISTS (SELECT 1 FROM messages WHERE resident_id = r.id)
      ORDER BY ultima_em DESC
      LIMIT 100
    `);
    return r.rows.map((linha) => ({
      resident_id: Number(linha.resident_id),
      nome: String(linha.full_name ?? ''),
      protocolo: String(linha.protocol ?? ''),
      ultima_mensagem: String(linha.ultima ?? ''),
      remetente_ultima: (String(linha.remetente ?? 'morador') as RemetenteMensagem),
      ultima_em: iso(linha.ultima_em),
      nao_lidas: Number(linha.nao_lidas ?? 0),
    }));
  },

  async salvarInscricaoPush(moradorId, endpoint, p256dh, auth): Promise<void> {
    await pool().query(
      `INSERT INTO push_subscriptions (resident_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE
       SET resident_id = EXCLUDED.resident_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [moradorId, endpoint, p256dh, auth]
    );
  },

  async removerInscricaoPush(endpoint: string): Promise<void> {
    await pool().query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
  },

  async listarInscricoesPush(moradorId: number): Promise<InscricaoPush[]> {
    const r = await pool().query(
      'SELECT * FROM push_subscriptions WHERE resident_id = $1',
      [moradorId]
    );
    return r.rows.map((linha) => ({
      id: Number(linha.id),
      resident_id: Number(linha.resident_id),
      endpoint: String(linha.endpoint ?? ''),
      p256dh: String(linha.p256dh ?? ''),
      auth: String(linha.auth ?? ''),
      created_at: iso(linha.created_at),
    }));
  },

  async obterModeloComunicado(): Promise<ModeloComunicado> {
    const r = await pool().query('SELECT value FROM settings WHERE key = $1', [
      'modelo_comunicado',
    ]);
    if (!r.rows[0]) return { ...MODELO_COMUNICADO_PADRAO };
    try {
      const salvo = JSON.parse(String(r.rows[0].value)) as ModeloComunicado;
      if (salvo && typeof salvo.titulo === 'string' && typeof salvo.corpo === 'string') {
        return salvo;
      }
    } catch {
      /* valor corrompido: volta ao padrão */
    }
    return { ...MODELO_COMUNICADO_PADRAO };
  },

  async salvarModeloComunicado(modelo: ModeloComunicado): Promise<void> {
    await pool().query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      ['modelo_comunicado', JSON.stringify(modelo)]
    );
  },

  async criarComunicado(moradorId, loteId, titulo, corpo): Promise<Comunicado> {
    const r = await pool().query(
      `INSERT INTO announcements (batch_id, resident_id, title, body)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [loteId, moradorId, titulo, corpo]
    );
    return paraComunicado(r.rows[0]);
  },

  async listarComunicadosDoMorador(moradorId: number): Promise<Comunicado[]> {
    const r = await pool().query(
      'SELECT * FROM announcements WHERE resident_id = $1 ORDER BY created_at DESC, id DESC',
      [moradorId]
    );
    return r.rows.map(paraComunicado);
  },

  async listarLotesComunicados(): Promise<LoteComunicado[]> {
    const r = await pool().query(
      `SELECT batch_id, min(title) AS title, min(created_at) AS created_at, count(*)::int AS total
       FROM announcements GROUP BY batch_id ORDER BY min(created_at) DESC LIMIT 50`
    );
    return r.rows.map((linha) => ({
      lote_id: String(linha.batch_id),
      titulo: String(linha.title),
      criado_em: iso(linha.created_at),
      total: Number(linha.total),
    }));
  },
};
