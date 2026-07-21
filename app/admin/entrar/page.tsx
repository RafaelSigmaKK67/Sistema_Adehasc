'use client';

// Entrada da equipe ADEHASC: e-mail + senha.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import Logo from '@/components/Logo';
import CampoSenha from '@/components/CampoSenha';

export default function PaginaAdminEntrar() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const resposta = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), senha }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro((dados && dados.erro) || 'Não conseguimos entrar. Tente de novo.');
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setErro('Não conseguimos falar com o servidor. Confira a sua internet e tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="pagina-entrar">
      <div className="container-estreito">
        <p className="texto-centro">
          <Link href="/">
            <Logo tamanho={72} vertical comTagline />
          </Link>
        </p>
        <div className="cartao">
          <h1>Área administrativa</h1>
          <p className="texto-suave">Acesso restrito à equipe da ADEHASC.</p>
          {erro && (
            <div className="aviso aviso-erro" role="alert">
              {erro}
            </div>
          )}
          <form onSubmit={entrar} noValidate>
            <div className="campo">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
            <CampoSenha
              id="senha"
              rotulo="Senha"
              valor={senha}
              aoMudar={setSenha}
              autoComplete="current-password"
            />
            <button type="submit" className="botao botao-primario botao-largo" disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
        <p className="texto-centro">
          <Link href="/">← Voltar para o site</Link>
        </p>
      </div>
    </main>
  );
}
