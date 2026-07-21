'use client';

// Painel do morador: andamento, linha do tempo, documentos, dados e ajuda.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import CampoSenha from '@/components/CampoSenha';
import { ETAPAS, ROTULO_SITUACAO, SituacaoDocumento } from '@/lib/etapas';
import {
  formatarCpf,
  formatarDataHora,
  limparTelefone,
  mascaraTelefone,
  primeiroNome,
} from '@/lib/formatar';

type MoradorPainel = {
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
};

type Atualizacao = { id: number; message: string; stage: number | null; author: string; created_at: string };
type Documento = { id: number; name: string; status: SituacaoDocumento };

type DadosPainel = {
  morador: MoradorPainel;
  atualizacoes: Atualizacao[];
  documentos: Documento[];
};

export default function PaginaPainel() {
  const router = useRouter();
  const [dados, setDados] = useState<DadosPainel | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch('/api/me', { cache: 'no-store' });
      if (resposta.status === 401) {
        router.replace('/entrar');
        return;
      }
      if (!resposta.ok) {
        setErro('Não conseguimos carregar os seus dados. Tente de novo em instantes.');
        return;
      }
      setDados(await resposta.json());
    } catch {
      setErro('Não conseguimos falar com o servidor. Confira a sua internet.');
    } finally {
      setCarregando(false);
    }
  }, [router]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function sair() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.push('/');
  }

  if (carregando) {
    return (
      <main className="painel-corpo">
        <div className="container">
          <p role="status">Carregando o seu painel…</p>
        </div>
      </main>
    );
  }

  if (erro || !dados) {
    return (
      <main className="painel-corpo">
        <div className="container-estreito">
          <div className="aviso aviso-erro" role="alert">
            {erro || 'Algo deu errado. Tente entrar de novo.'}
          </div>
          <Link className="botao botao-contorno" href="/entrar">
            Ir para a página de entrada
          </Link>
        </div>
      </main>
    );
  }

  const { morador, atualizacoes, documentos } = dados;

  if (morador.must_change) {
    return <TrocarSenhaObrigatoria aoConcluir={carregar} />;
  }

  const etapaAtual = morador.stage;
  const percentual = etapaAtual >= 7 ? 100 : Math.round(((etapaAtual - 1) / 7) * 100);
  const documentosPendentes = documentos.filter((d) => d.status === 'pendente');

  return (
    <>
      <header className="painel-topo">
        <div className="container painel-topo-linha">
          <div className="painel-saudacao">
            <h1>Olá, {primeiroNome(morador.full_name)}!</h1>
            <p className="painel-protocolo sem-margem">Protocolo: {morador.protocol}</p>
          </div>
          <div className="cabecalho-acoes">
            <Link className="botao botao-suave" href="/">
              <Logo tamanho={28} />
            </Link>
            <button type="button" className="botao botao-contorno" onClick={sair}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="painel-corpo">
        <div className="container painel-grade">
          <div>
            <section className="cartao" aria-labelledby="titulo-andamento">
              <h2 id="titulo-andamento">Andamento do seu processo</h2>
              <p className="progresso-texto sem-margem">{percentual}% concluído</p>
              <div className="barra-progresso" role="img" aria-label={`${percentual} por cento concluído`}>
                <div className="barra-progresso-preenchida" style={{ width: `${percentual}%` }} />
              </div>
              <ol className="lista-etapas">
                {ETAPAS.map((etapa) => {
                  const feita = etapa.numero < etapaAtual || etapaAtual === 7;
                  const atual = etapa.numero === etapaAtual && etapaAtual !== 7;
                  const classe = feita ? 'etapa-feita' : atual ? 'etapa-atual' : 'etapa-futura';
                  return (
                    <li key={etapa.numero} className={classe} aria-current={atual ? 'step' : undefined}>
                      <span className="etapa-circulo" aria-hidden="true">
                        {feita ? '✓' : etapa.numero}
                      </span>
                      <div>
                        <span className="etapa-nome">
                          {etapa.titulo}
                          {feita && <span className="escondido-visual"> (concluída)</span>}
                          {atual && <span className="escondido-visual"> (etapa atual)</span>}
                        </span>
                        {(atual || (etapa.numero === 7 && etapaAtual === 7)) && (
                          <p className="etapa-texto">{etapa.texto}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            <section className="cartao" aria-labelledby="titulo-atualizacoes">
              <h2 id="titulo-atualizacoes">Atualizações</h2>
              {atualizacoes.length === 0 ? (
                <p className="texto-suave sem-margem">Ainda não há atualizações por aqui.</p>
              ) : (
                <ol className="linha-tempo">
                  {atualizacoes.map((atualizacao) => (
                    <li key={atualizacao.id}>
                      <span className="linha-tempo-data">
                        {formatarDataHora(atualizacao.created_at)} — {atualizacao.author}
                      </span>
                      <p className="linha-tempo-mensagem">{atualizacao.message}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <div>
            <section className="cartao" aria-labelledby="titulo-documentos-painel">
              <h2 id="titulo-documentos-painel">Meus documentos</h2>
              {documentosPendentes.length > 0 ? (
                <div className="aviso">
                  <strong>Falta entregar:</strong>{' '}
                  {documentosPendentes.map((d) => d.name).join('; ')}.
                </div>
              ) : (
                <div className="aviso aviso-ok">Todos os documentos foram entregues. Muito bem!</div>
              )}
              <ul className="lista-docs">
                {documentos.map((documento) => (
                  <li key={documento.id}>
                    <span>{documento.name}</span>
                    <span className={`pilula pilula-${documento.status}`}>
                      {ROTULO_SITUACAO[documento.status]}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <MeusDados morador={morador} aoSalvar={carregar} />

            <section className="cartao" aria-labelledby="titulo-ajuda">
              <h2 id="titulo-ajuda">Precisa de ajuda?</h2>
              <p>Qualquer dúvida, ligue para a gente. Atendemos com todo o carinho:</p>
              <ul className="ajuda-fones">
                <li>
                  ☎ <a href="tel:+554936223137">(49) 3622-3137</a>
                </li>
                <li>
                  📱 <a href="tel:+5549985031080">(49) 98503-1080</a> (WhatsApp)
                </li>
              </ul>
              <p className="texto-suave sem-margem">
                Ou visite a gente: Avenida Salgado Filho, nº 559, Centro.
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

function MeusDados({ morador, aoSalvar }: { morador: MoradorPainel; aoSalvar: () => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  const [telefone, setTelefone] = useState(mascaraTelefone(morador.phone));
  const [email, setEmail] = useState(morador.email || '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    if (limparTelefone(telefone).length < 10) {
      setErro('Escreva o telefone com DDD. Por exemplo: (49) 98503-1080.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErro('Este e-mail não parece completo. Confira se tem @ e o final (.com, .br…).');
      return;
    }
    setSalvando(true);
    try {
      const resposta = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: limparTelefone(telefone), email: email.trim() || null }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro((dados && dados.erro) || 'Não conseguimos salvar. Tente de novo.');
        return;
      }
      setEditando(false);
      setSalvo(true);
      await aoSalvar();
    } catch {
      setErro('Não conseguimos falar com o servidor. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="cartao" aria-labelledby="titulo-meus-dados">
      <h2 id="titulo-meus-dados">Meus dados</h2>
      {salvo && !editando && (
        <div className="aviso aviso-ok" role="status">
          Contatos atualizados com sucesso!
        </div>
      )}
      <dl className="dados-lista sem-margem">
        <div className="revisao-linha">
          <dt>Nome</dt>
          <dd>{morador.full_name}</dd>
        </div>
        <div className="revisao-linha">
          <dt>CPF</dt>
          <dd>{formatarCpf(morador.cpf)}</dd>
        </div>
        <div className="revisao-linha">
          <dt>Nascimento</dt>
          <dd>{morador.birth_date || '—'}</dd>
        </div>
        <div className="revisao-linha">
          <dt>Estado civil</dt>
          <dd>{morador.marital_status || '—'}</dd>
        </div>
        <div className="revisao-linha">
          <dt>Endereço</dt>
          <dd>
            {[morador.street, morador.number, morador.neighborhood, morador.city]
              .filter(Boolean)
              .join(', ') || morador.city}
          </dd>
        </div>
        <div className="revisao-linha">
          <dt>Tipo de imóvel</dt>
          <dd>{morador.property_type || '—'}</dd>
        </div>
        {!editando && (
          <>
            <div className="revisao-linha">
              <dt>Telefone</dt>
              <dd>{mascaraTelefone(morador.phone)}</dd>
            </div>
            <div className="revisao-linha">
              <dt>E-mail</dt>
              <dd>{morador.email || '—'}</dd>
            </div>
          </>
        )}
      </dl>

      {editando ? (
        <form onSubmit={salvar} className="mt-2" noValidate>
          {erro && (
            <div className="aviso aviso-erro" role="alert">
              {erro}
            </div>
          )}
          <div className="campo">
            <label htmlFor="painel-telefone">Telefone ou WhatsApp</label>
            <input
              id="painel-telefone"
              type="tel"
              inputMode="numeric"
              value={telefone}
              onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
            />
          </div>
          <div className="campo">
            <label htmlFor="painel-email">E-mail (se tiver)</label>
            <input
              id="painel-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="acoes-linha">
            <button type="submit" className="botao botao-verde" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              type="button"
              className="botao botao-suave"
              onClick={() => {
                setEditando(false);
                setErro('');
                setTelefone(mascaraTelefone(morador.phone));
                setEmail(morador.email || '');
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <>
          <button
            type="button"
            className="botao botao-contorno botao-largo mt-2"
            onClick={() => {
              setEditando(true);
              setSalvo(false);
            }}
          >
            Alterar telefone ou e-mail
          </button>
          <p className="texto-suave mt-1 sem-margem">
            Os outros dados só podem ser alterados pela equipe da ADEHASC. É uma proteção para
            você.
          </p>
        </>
      )}
    </section>
  );
}

function TrocarSenhaObrigatoria({ aoConcluir }: { aoConcluir: () => Promise<void> }) {
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function trocar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    if (senha.length < 6) {
      setErro('A senha nova precisa ter pelo menos 6 letras ou números.');
      return;
    }
    if (confirmar !== senha) {
      setErro('As duas senhas precisam ser iguais. Escreva de novo, com calma.');
      return;
    }
    setSalvando(true);
    try {
      const resposta = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nova_senha: senha }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro((dados && dados.erro) || 'Não conseguimos trocar a senha. Tente de novo.');
        return;
      }
      await aoConcluir();
    } catch {
      setErro('Não conseguimos falar com o servidor. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="pagina-entrar">
      <div className="container-estreito">
        <p className="texto-centro">
          <Logo tamanho={40} />
        </p>
        <div className="cartao">
          <h1>Crie a sua nova senha</h1>
          <div className="aviso aviso-info">
            Você entrou com uma <strong>senha temporária</strong>. Por segurança, crie agora
            uma senha nova, do seu jeito.
          </div>
          {erro && (
            <div className="aviso aviso-erro" role="alert">
              {erro}
            </div>
          )}
          <form onSubmit={trocar} noValidate>
            <CampoSenha
              id="nova-senha"
              rotulo="Senha nova"
              dica="Use pelo menos 6 letras ou números. Escolha algo fácil de lembrar."
              valor={senha}
              aoMudar={setSenha}
              autoComplete="new-password"
            />
            <CampoSenha
              id="confirmar-senha"
              rotulo="Escreva a senha nova de novo"
              valor={confirmar}
              aoMudar={setConfirmar}
              autoComplete="new-password"
            />
            <button type="submit" className="botao botao-primario botao-largo" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar minha nova senha'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
