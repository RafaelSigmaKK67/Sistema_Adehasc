'use client';

// Ficha do morador: dados, etapa, atualizações, documentos, notas internas,
// redefinição de senha e exclusão do cadastro.

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ETAPAS, ROTULO_SITUACAO, SITUACOES_DOCUMENTO, SituacaoDocumento, etapaInfo } from '@/lib/etapas';
import { cpfValido, limparCpf } from '@/lib/cpf';
import {
  dataValida,
  formatarDataHora,
  limparTelefone,
  mascaraCpf,
  mascaraData,
  mascaraTelefone,
} from '@/lib/formatar';

const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)'];
const TIPOS_IMOVEL = ['Casa', 'Terreno', 'Outro'];

type MoradorFicha = {
  id: number;
  protocol: string;
  full_name: string;
  cpf: string;
  birth_date: string | null;
  phone: string;
  email: string | null;
  marital_status: string | null;
  city: string;
  neighborhood: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  years_living: number | null;
  property_type: string | null;
  stage: number;
  must_change: boolean;
  created_at: string;
  updated_at: string;
};

type Atualizacao = { id: number; message: string; stage: number | null; author: string; created_at: string };
type Documento = { id: number; name: string; status: SituacaoDocumento };
type Nota = { id: number; text: string; created_at: string };
type ComunicadoFicha = { id: number; title: string; body: string; created_at: string };

type Ficha = {
  morador: MoradorFicha;
  atualizacoes: Atualizacao[];
  documentos: Documento[];
  notas: Nota[];
  comunicados: ComunicadoFicha[];
};

export default function PaginaFichaMorador() {
  const parametros = useParams<{ id: string }>();
  const router = useRouter();
  const id = parametros.id;

  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [erro, setErro] = useState('');
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/admin/residents/${id}`, { cache: 'no-store' });
      if (resposta.status === 401) {
        router.replace('/admin/entrar');
        return;
      }
      if (resposta.status === 404) {
        setNaoEncontrado(true);
        return;
      }
      if (!resposta.ok) throw new Error();
      setFicha(await resposta.json());
    } catch {
      setErro('Não conseguimos carregar a ficha. Recarregue a página.');
    }
  }, [id, router]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (naoEncontrado) {
    return (
      <div>
        <div className="aviso aviso-erro" role="alert">
          Este cadastro não existe mais.
        </div>
        <Link className="botao botao-contorno" href="/admin/moradores">
          ← Voltar para a lista
        </Link>
      </div>
    );
  }
  if (erro) {
    return (
      <div className="aviso aviso-erro" role="alert">
        {erro}
      </div>
    );
  }
  if (!ficha) return <p role="status">Carregando a ficha…</p>;

  const { morador } = ficha;

  return (
    <div>
      <div className="ficha-topo">
        <div>
          <h1 className="sem-margem">{morador.full_name}</h1>
          <p className="texto-suave sem-margem">
            Protocolo {morador.protocol} · CPF {mascaraCpf(morador.cpf)} · Cadastro em{' '}
            {formatarDataHora(morador.created_at)}
          </p>
        </div>
        <div className="acoes-linha">
          <Link className="botao botao-contorno" href={`/admin/mensagens/${morador.id}`}>
            💬 Conversar
          </Link>
          <Link className="botao botao-suave" href="/admin/moradores">
            ← Voltar para a lista
          </Link>
        </div>
      </div>

      <div className="painel-grade">
        <div>
          <MudarEtapa morador={morador} aoSalvar={carregar} />
          <NovaAtualizacao moradorId={morador.id} aoSalvar={carregar} />

          <section className="cartao" aria-labelledby="titulo-linha-tempo">
            <h2 id="titulo-linha-tempo">Linha do tempo do morador</h2>
            {ficha.atualizacoes.length === 0 ? (
              <p className="texto-suave sem-margem">Nenhuma atualização publicada.</p>
            ) : (
              <ol className="linha-tempo">
                {ficha.atualizacoes.map((atualizacao) => (
                  <li key={atualizacao.id}>
                    <span className="linha-tempo-data">
                      {formatarDataHora(atualizacao.created_at)} — {atualizacao.author}
                      {atualizacao.stage ? ` · etapa ${atualizacao.stage}` : ''}
                    </span>
                    <p className="linha-tempo-mensagem">{atualizacao.message}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <DadosCadastrais morador={morador} aoSalvar={carregar} />
        </div>

        <div>
          <Documentos moradorId={morador.id} documentos={ficha.documentos} aoSalvar={carregar} />

          <section className="cartao" aria-labelledby="titulo-comunicados-ficha">
            <h2 id="titulo-comunicados-ficha">Comunicados</h2>
            {ficha.comunicados.length === 0 ? (
              <p className="texto-suave">Nenhum comunicado enviado para este morador.</p>
            ) : (
              <ul className="lista-comunicados">
                {ficha.comunicados.map((comunicado) => (
                  <li key={comunicado.id}>
                    <details style={{ width: '100%' }}>
                      <summary>
                        <strong>{comunicado.title}</strong>
                        <span className="texto-suave"> · {formatarDataHora(comunicado.created_at)}</span>
                      </summary>
                      <p className="documento-corpo mt-1 sem-margem">{comunicado.body}</p>
                    </details>
                  </li>
                ))}
              </ul>
            )}
            <Link
              className="botao botao-contorno botao-mini mt-2"
              href={`/admin/comunicados?para=${encodeURIComponent(morador.protocol)}`}
            >
              Novo comunicado para este morador
            </Link>
          </section>

          <NotasInternas moradorId={morador.id} notas={ficha.notas} aoSalvar={carregar} />
          <RedefinirSenha moradorId={morador.id} deveTrocar={morador.must_change} aoSalvar={carregar} />
          <ExcluirCadastro moradorId={morador.id} nome={morador.full_name} />
        </div>
      </div>
    </div>
  );
}

function MudarEtapa({ morador, aoSalvar }: { morador: MoradorFicha; aoSalvar: () => Promise<void> }) {
  const [etapa, setEtapa] = useState(String(morador.stage));
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    setEtapa(String(morador.stage));
  }, [morador.stage]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setAviso('');
    setSalvando(true);
    try {
      const resposta = await fetch(`/api/admin/residents/${morador.id}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa: Number(etapa), mensagem: mensagem.trim() || null }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro((dados && dados.erro) || 'Não conseguimos mudar a etapa. Tente de novo.');
        return;
      }
      setMensagem('');
      setAviso('Etapa atualizada! O morador já vê a novidade no painel dele.');
      await aoSalvar();
    } catch {
      setErro('Não conseguimos falar com o servidor. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="cartao" aria-labelledby="titulo-etapa">
      <h2 id="titulo-etapa">Etapa do processo</h2>
      <p>
        Etapa atual:{' '}
        <span className={`pilula ${morador.stage === 7 ? 'pilula-etapa-final' : 'pilula-etapa'}`}>
          {morador.stage}. {etapaInfo(morador.stage).titulo}
        </span>
      </p>
      {aviso && (
        <div className="aviso aviso-ok" role="status">
          {aviso}
        </div>
      )}
      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}
      <form onSubmit={salvar}>
        <div className="campo">
          <label htmlFor="nova-etapa">Mudar para a etapa</label>
          <select id="nova-etapa" value={etapa} onChange={(e) => setEtapa(e.target.value)}>
            {ETAPAS.map((opcao) => (
              <option key={opcao.numero} value={opcao.numero}>
                {opcao.numero}. {opcao.titulo}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="mensagem-etapa">Mensagem para o morador (opcional)</label>
          <p className="campo-dica">
            Se ficar em branco, publicamos o texto padrão da etapa na linha do tempo.
          </p>
          <textarea
            id="mensagem-etapa"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
          />
        </div>
        <button type="submit" className="botao botao-primario" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar etapa e avisar o morador'}
        </button>
      </form>
    </section>
  );
}

function NovaAtualizacao({ moradorId, aoSalvar }: { moradorId: number; aoSalvar: () => Promise<void> }) {
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');

  async function publicar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setAviso('');
    if (mensagem.trim().length < 3) {
      setErro('Escreva a mensagem antes de publicar.');
      return;
    }
    setSalvando(true);
    try {
      const resposta = await fetch(`/api/admin/residents/${moradorId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: mensagem.trim() }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro((dados && dados.erro) || 'Não conseguimos publicar. Tente de novo.');
        return;
      }
      setMensagem('');
      setAviso('Aviso publicado na linha do tempo do morador!');
      await aoSalvar();
    } catch {
      setErro('Não conseguimos falar com o servidor. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="cartao" aria-labelledby="titulo-nova-atualizacao">
      <h2 id="titulo-nova-atualizacao">Nova atualização</h2>
      <p className="texto-suave">
        O morador vê esta mensagem na hora, no painel dele. Ex.: “A vistoria será na
        quinta-feira à tarde”.
      </p>
      {aviso && (
        <div className="aviso aviso-ok" role="status">
          {aviso}
        </div>
      )}
      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}
      <form onSubmit={publicar}>
        <div className="campo">
          <label htmlFor="nova-mensagem">Mensagem</label>
          <textarea
            id="nova-mensagem"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
          />
        </div>
        <button type="submit" className="botao botao-contorno" disabled={salvando}>
          {salvando ? 'Publicando…' : 'Publicar aviso'}
        </button>
      </form>
    </section>
  );
}

function DadosCadastrais({ morador, aoSalvar }: { morador: MoradorFicha; aoSalvar: () => Promise<void> }) {
  const [form, setForm] = useState({
    nome: morador.full_name,
    cpf: mascaraCpf(morador.cpf),
    nascimento: morador.birth_date || '',
    telefone: mascaraTelefone(morador.phone),
    email: morador.email || '',
    estado_civil: morador.marital_status || '',
    municipio: morador.city,
    bairro: morador.neighborhood || '',
    rua: morador.street || '',
    numero: morador.number || '',
    complemento: morador.complement || '',
    anos_moradia: morador.years_living === null ? '' : String(morador.years_living),
    tipo_imovel: morador.property_type || '',
  });
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);

  function mudar(campo: keyof typeof form, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setAviso('');
    if (form.nome.trim().length < 5) {
      setErro('Escreva o nome completo do morador.');
      return;
    }
    if (!cpfValido(form.cpf)) {
      setErro('O CPF informado não é válido. Confira os números.');
      return;
    }
    if (form.nascimento.trim() && !dataValida(form.nascimento)) {
      setErro('A data de nascimento precisa estar no formato dd/mm/aaaa.');
      return;
    }
    if (limparTelefone(form.telefone).length < 10) {
      setErro('Escreva o telefone com DDD.');
      return;
    }
    if (form.municipio.trim().length < 2) {
      setErro('Escreva o município.');
      return;
    }
    setSalvando(true);
    try {
      const resposta = await fetch(`/api/admin/residents/${morador.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          cpf: limparCpf(form.cpf),
          nascimento: form.nascimento.trim() || null,
          telefone: limparTelefone(form.telefone),
          email: form.email.trim() || null,
          estado_civil: form.estado_civil || null,
          municipio: form.municipio.trim(),
          bairro: form.bairro.trim() || null,
          rua: form.rua.trim() || null,
          numero: form.numero.trim() || null,
          complemento: form.complemento.trim() || null,
          anos_moradia: form.anos_moradia.trim() ? Number(form.anos_moradia) : null,
          tipo_imovel: form.tipo_imovel || null,
        }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro((dados && dados.erro) || 'Não conseguimos salvar. Tente de novo.');
        return;
      }
      setAviso('Dados salvos com sucesso!');
      await aoSalvar();
    } catch {
      setErro('Não conseguimos falar com o servidor. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="cartao" aria-labelledby="titulo-dados-cadastrais">
      <h2 id="titulo-dados-cadastrais">Dados cadastrais</h2>
      {aviso && (
        <div className="aviso aviso-ok" role="status">
          {aviso}
        </div>
      )}
      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}
      <form onSubmit={salvar} noValidate>
        <div className="grade-campos">
          <div className="campo">
            <label htmlFor="f-nome">Nome completo</label>
            <input id="f-nome" value={form.nome} onChange={(e) => mudar('nome', e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="f-cpf">CPF</label>
            <input
              id="f-cpf"
              inputMode="numeric"
              value={form.cpf}
              onChange={(e) => mudar('cpf', mascaraCpf(e.target.value))}
            />
          </div>
          <div className="campo">
            <label htmlFor="f-nascimento">Data de nascimento</label>
            <input
              id="f-nascimento"
              inputMode="numeric"
              placeholder="dd/mm/aaaa"
              value={form.nascimento}
              onChange={(e) => mudar('nascimento', mascaraData(e.target.value))}
            />
          </div>
          <div className="campo">
            <label htmlFor="f-telefone">Telefone</label>
            <input
              id="f-telefone"
              inputMode="numeric"
              value={form.telefone}
              onChange={(e) => mudar('telefone', mascaraTelefone(e.target.value))}
            />
          </div>
          <div className="campo">
            <label htmlFor="f-email">E-mail</label>
            <input id="f-email" type="email" value={form.email} onChange={(e) => mudar('email', e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="f-estado-civil">Estado civil</label>
            <select
              id="f-estado-civil"
              value={form.estado_civil}
              onChange={(e) => mudar('estado_civil', e.target.value)}
            >
              <option value="">—</option>
              {ESTADOS_CIVIS.map((opcao) => (
                <option key={opcao} value={opcao}>
                  {opcao}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-municipio">Município</label>
            <input id="f-municipio" value={form.municipio} onChange={(e) => mudar('municipio', e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="f-bairro">Bairro/núcleo</label>
            <input id="f-bairro" value={form.bairro} onChange={(e) => mudar('bairro', e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="f-rua">Rua</label>
            <input id="f-rua" value={form.rua} onChange={(e) => mudar('rua', e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="f-numero">Número</label>
            <input id="f-numero" value={form.numero} onChange={(e) => mudar('numero', e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="f-complemento">Complemento</label>
            <input id="f-complemento" value={form.complemento} onChange={(e) => mudar('complemento', e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="f-anos">Anos no imóvel</label>
            <input
              id="f-anos"
              inputMode="numeric"
              value={form.anos_moradia}
              onChange={(e) => mudar('anos_moradia', e.target.value.replace(/\D/g, '').slice(0, 3))}
            />
          </div>
          <div className="campo">
            <label htmlFor="f-tipo">Tipo de imóvel</label>
            <select id="f-tipo" value={form.tipo_imovel} onChange={(e) => mudar('tipo_imovel', e.target.value)}>
              <option value="">—</option>
              {TIPOS_IMOVEL.map((opcao) => (
                <option key={opcao} value={opcao}>
                  {opcao}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className="botao botao-verde" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar dados cadastrais'}
        </button>
      </form>
    </section>
  );
}

function Documentos({
  moradorId,
  documentos,
  aoSalvar,
}: {
  moradorId: number;
  documentos: Documento[];
  aoSalvar: () => Promise<void>;
}) {
  const [erro, setErro] = useState('');
  const [salvandoId, setSalvandoId] = useState<number | null>(null);

  async function mudarSituacao(documentoId: number, situacao: SituacaoDocumento) {
    setErro('');
    setSalvandoId(documentoId);
    try {
      const resposta = await fetch(`/api/admin/residents/${moradorId}/documents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documento_id: documentoId, situacao }),
      });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErro((dados && dados.erro) || 'Não conseguimos salvar a situação do documento.');
        return;
      }
      await aoSalvar();
    } catch {
      setErro('Não conseguimos falar com o servidor. Tente de novo.');
    } finally {
      setSalvandoId(null);
    }
  }

  return (
    <section className="cartao" aria-labelledby="titulo-docs-admin">
      <h2 id="titulo-docs-admin">Documentos</h2>
      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}
      <ul className="lista-docs">
        {documentos.map((documento) => (
          <li key={documento.id} style={{ flexWrap: 'wrap' }}>
            <span style={{ flex: '1 1 100%' }}>
              {documento.name}{' '}
              <span className={`pilula pilula-${documento.status}`}>
                {ROTULO_SITUACAO[documento.status]}
              </span>
            </span>
            <span className="acoes-linha">
              {SITUACOES_DOCUMENTO.filter((s) => s !== documento.status).map((situacao) => (
                <button
                  key={situacao}
                  type="button"
                  className="botao botao-suave botao-mini"
                  disabled={salvandoId === documento.id}
                  onClick={() => mudarSituacao(documento.id, situacao)}
                >
                  Marcar {ROTULO_SITUACAO[situacao].toLowerCase()}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NotasInternas({
  moradorId,
  notas,
  aoSalvar,
}: {
  moradorId: number;
  notas: Nota[];
  aoSalvar: () => Promise<void>;
}) {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    if (texto.trim().length < 2) {
      setErro('Escreva a anotação antes de salvar.');
      return;
    }
    setSalvando(true);
    try {
      const resposta = await fetch(`/api/admin/residents/${moradorId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: texto.trim() }),
      });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErro((dados && dados.erro) || 'Não conseguimos salvar a nota.');
        return;
      }
      setTexto('');
      await aoSalvar();
    } catch {
      setErro('Não conseguimos falar com o servidor. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="cartao" aria-labelledby="titulo-notas">
      <h2 id="titulo-notas">Notas internas</h2>
      <p className="texto-suave">Visíveis só para a equipe — o morador não vê.</p>
      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}
      <form onSubmit={adicionar}>
        <div className="campo">
          <label htmlFor="nova-nota">Nova anotação</label>
          <textarea id="nova-nota" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
        <button type="submit" className="botao botao-contorno botao-mini" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar nota'}
        </button>
      </form>
      <div className="mt-2">
        {notas.length === 0 ? (
          <p className="texto-suave sem-margem">Nenhuma nota por enquanto.</p>
        ) : (
          notas.map((nota) => (
            <div className="nota-item" key={nota.id}>
              <span className="nota-data">{formatarDataHora(nota.created_at)}</span>
              <p className="sem-margem">{nota.text}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function RedefinirSenha({
  moradorId,
  deveTrocar,
  aoSalvar,
}: {
  moradorId: number;
  deveTrocar: boolean;
  aoSalvar: () => Promise<void>;
}) {
  const [senhaTemporaria, setSenhaTemporaria] = useState('');
  const [erro, setErro] = useState('');
  const [gerando, setGerando] = useState(false);

  async function redefinir() {
    setErro('');
    setGerando(true);
    try {
      const resposta = await fetch(`/api/admin/residents/${moradorId}/reset-password`, {
        method: 'POST',
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro((dados && dados.erro) || 'Não conseguimos gerar a senha. Tente de novo.');
        return;
      }
      setSenhaTemporaria(dados.senha_temporaria);
      await aoSalvar();
    } catch {
      setErro('Não conseguimos falar com o servidor. Tente de novo.');
    } finally {
      setGerando(false);
    }
  }

  return (
    <section className="cartao" aria-labelledby="titulo-senha">
      <h2 id="titulo-senha">Redefinir senha</h2>
      <p className="texto-suave">
        Gera uma senha temporária fácil de ditar por telefone. O morador é obrigado a criar
        uma senha nova no próximo acesso.
      </p>
      {deveTrocar && !senhaTemporaria && (
        <div className="aviso aviso-info">
          Este morador está com senha temporária ativa (ainda não trocou).
        </div>
      )}
      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}
      {senhaTemporaria ? (
        <div>
          <div className="aviso aviso-ok">
            <strong>Anote e informe ao morador agora.</strong> Por segurança, esta senha é
            mostrada só esta vez:
          </div>
          <p className="senha-temporaria" aria-live="polite">
            {senhaTemporaria}
          </p>
        </div>
      ) : (
        <button type="button" className="botao botao-contorno" onClick={redefinir} disabled={gerando}>
          {gerando ? 'Gerando…' : 'Gerar senha temporária'}
        </button>
      )}
    </section>
  );
}

function ExcluirCadastro({ moradorId, nome }: { moradorId: number; nome: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  async function excluir() {
    setErro('');
    setExcluindo(true);
    try {
      const resposta = await fetch(`/api/admin/residents/${moradorId}`, { method: 'DELETE' });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErro((dados && dados.erro) || 'Não conseguimos excluir o cadastro.');
        return;
      }
      router.push('/admin/moradores');
      router.refresh();
    } catch {
      setErro('Não conseguimos falar com o servidor. Tente de novo.');
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <section className="cartao" aria-labelledby="titulo-excluir">
      <h2 id="titulo-excluir">Excluir cadastro</h2>
      <p className="texto-suave">
        Apaga o cadastro de {nome} com todo o histórico, documentos e notas. Essa ação não
        pode ser desfeita.
      </p>
      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}
      {confirmando ? (
        <div>
          <div className="aviso aviso-erro">
            <strong>Tem certeza?</strong> Todo o histórico deste morador será apagado para
            sempre.
          </div>
          <div className="acoes-linha">
            <button type="button" className="botao botao-perigo" onClick={excluir} disabled={excluindo}>
              {excluindo ? 'Excluindo…' : 'Sim, excluir de vez'}
            </button>
            <button type="button" className="botao botao-suave" onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="botao botao-perigo" onClick={() => setConfirmando(true)}>
          Excluir cadastro
        </button>
      )}
    </section>
  );
}
