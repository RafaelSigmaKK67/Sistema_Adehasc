'use client';

// Configurações: trocar a própria senha, criar/listar administradores e situação do sistema.

import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import CampoSenha from '@/components/CampoSenha';
import { formatarData } from '@/lib/formatar';

type AdminLinha = {
  id: number;
  name: string;
  email: string;
  password_changed: boolean;
  created_at: string;
};

type Situacao = { modo: 'banco' | 'demonstracao'; segredo_configurado: boolean };

export default function PaginaConfiguracoes() {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminLinha[]>([]);
  const [situacao, setSituacao] = useState<Situacao | null>(null);
  const [erroLista, setErroLista] = useState('');

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch('/api/admin/admins', { cache: 'no-store' });
      if (resposta.status === 401) {
        router.replace('/admin/entrar');
        return;
      }
      if (!resposta.ok) throw new Error();
      const dados = await resposta.json();
      setAdmins(dados.admins);
    } catch {
      setErroLista('Não conseguimos carregar a lista de administradores.');
    }
    try {
      const saude = await fetch('/api/health', { cache: 'no-store' });
      if (saude.ok) setSituacao(await saude.json());
    } catch {
      /* a situação do sistema é informativa */
    }
  }, [router]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <div>
      <h1>Configurações</h1>

      <div className="painel-grade">
        <div>
          <TrocarSenha />
          <CriarAdmin aoCriar={carregar} />
        </div>
        <div>
          <section className="cartao" aria-labelledby="titulo-admins">
            <h2 id="titulo-admins">Administradores</h2>
            {erroLista && (
              <div className="aviso aviso-erro" role="alert">
                {erroLista}
              </div>
            )}
            <div className="tabela-caixa">
              <table className="tabela">
                <thead>
                  <tr>
                    <th scope="col">Nome</th>
                    <th scope="col">E-mail</th>
                    <th scope="col">Desde</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id}>
                      <td>
                        {admin.name}
                        {!admin.password_changed && (
                          <>
                            {' '}
                            <span className="pilula pilula-pendente">senha padrão</span>
                          </>
                        )}
                      </td>
                      <td>{admin.email}</td>
                      <td>{formatarData(admin.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="cartao" aria-labelledby="titulo-situacao">
            <h2 id="titulo-situacao">Situação do sistema</h2>
            {situacao ? (
              <ul className="lista-docs">
                <li>
                  <span>Banco de dados</span>
                  {situacao.modo === 'banco' ? (
                    <span className="pilula pilula-aprovado">Conectado (Postgres)</span>
                  ) : (
                    <span className="pilula pilula-pendente">Modo demonstração</span>
                  )}
                </li>
                <li>
                  <span>
                    <code>AUTH_SECRET</code>
                  </span>
                  {situacao.segredo_configurado ? (
                    <span className="pilula pilula-aprovado">Configurado</span>
                  ) : (
                    <span className="pilula pilula-pendente">Não configurado</span>
                  )}
                </li>
              </ul>
            ) : (
              <p className="texto-suave sem-margem">Carregando…</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function TrocarSenha() {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function trocar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setAviso('');
    if (nova.length < 8) {
      setErro('A senha nova precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (confirmar !== nova) {
      setErro('As duas senhas novas precisam ser iguais.');
      return;
    }
    setSalvando(true);
    try {
      const resposta = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha_atual: atual, nova_senha: nova }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro((dados && dados.erro) || 'Não conseguimos trocar a senha.');
        return;
      }
      setAtual('');
      setNova('');
      setConfirmar('');
      setAviso('Senha trocada com sucesso!');
    } catch {
      setErro('Não conseguimos falar com o servidor. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="cartao" aria-labelledby="titulo-trocar-senha">
      <h2 id="titulo-trocar-senha">Trocar a minha senha</h2>
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
      <form onSubmit={trocar} noValidate>
        <CampoSenha
          id="senha-atual"
          rotulo="Senha atual"
          valor={atual}
          aoMudar={setAtual}
          autoComplete="current-password"
        />
        <CampoSenha
          id="senha-nova"
          rotulo="Senha nova"
          dica="Pelo menos 8 caracteres."
          valor={nova}
          aoMudar={setNova}
          autoComplete="new-password"
        />
        <CampoSenha
          id="senha-confirmar"
          rotulo="Escreva a senha nova de novo"
          valor={confirmar}
          aoMudar={setConfirmar}
          autoComplete="new-password"
        />
        <button type="submit" className="botao botao-primario" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Trocar senha'}
        </button>
      </form>
    </section>
  );
}

function CriarAdmin({ aoCriar }: { aoCriar: () => Promise<void> }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function criar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setAviso('');
    if (nome.trim().length < 3) {
      setErro('Escreva o nome da pessoa.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErro('Escreva um e-mail válido.');
      return;
    }
    if (senha.length < 8) {
      setErro('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    setSalvando(true);
    try {
      const resposta = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), email: email.trim(), senha }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro((dados && dados.erro) || 'Não conseguimos criar o administrador.');
        return;
      }
      setNome('');
      setEmail('');
      setSenha('');
      setAviso('Administrador criado com sucesso!');
      await aoCriar();
    } catch {
      setErro('Não conseguimos falar com o servidor. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="cartao" aria-labelledby="titulo-criar-admin">
      <h2 id="titulo-criar-admin">Criar novo administrador</h2>
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
      <form onSubmit={criar} noValidate>
        <div className="campo">
          <label htmlFor="novo-nome">Nome</label>
          <input id="novo-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="novo-email">E-mail</label>
          <input id="novo-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <CampoSenha
          id="nova-senha-admin"
          rotulo="Senha"
          dica="Pelo menos 8 caracteres."
          valor={senha}
          aoMudar={setSenha}
          autoComplete="new-password"
        />
        <button type="submit" className="botao botao-contorno" disabled={salvando}>
          {salvando ? 'Criando…' : 'Criar administrador'}
        </button>
      </form>
    </section>
  );
}
