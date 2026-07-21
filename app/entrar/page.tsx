'use client';

// Entrada do morador: CPF + senha.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import CampoSenha from '@/components/CampoSenha';
import { limparCpf } from '@/lib/cpf';
import { mascaraCpf } from '@/lib/formatar';

export default function PaginaEntrar() {
  const router = useRouter();
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [demonstracao, setDemonstracao] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((dados) => setDemonstracao(dados.modo === 'demonstracao'))
      .catch(() => undefined);
  }, []);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const resposta = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: limparCpf(cpf), senha }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro((dados && dados.erro) || 'Não conseguimos entrar. Tente de novo, por favor.');
        return;
      }
      router.push('/painel');
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
          <h1>Acompanhar meu processo</h1>
          <p className="texto-suave">Entre com o seu CPF e a senha que você criou no cadastro.</p>

          {erro && (
            <div className="aviso aviso-erro" role="alert">
              {erro}
            </div>
          )}

          <form onSubmit={entrar} noValidate>
            <div className="campo">
              <label htmlFor="cpf">CPF</label>
              <input
                id="cpf"
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(mascaraCpf(e.target.value))}
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

          <p className="mt-3 sem-margem">
            <Link href="/cadastro">Ainda não tenho cadastro</Link>
            <br />
            <Link href="/esqueci-senha">Esqueci minha senha</Link>
          </p>

          {demonstracao && (
            <div className="caixa-teste">
              <strong>Acesso de teste (demonstração):</strong>
              <br />
              CPF <code>123.456.789-09</code> · senha <code>123456</code>
            </div>
          )}
        </div>
        <p className="texto-centro texto-suave">
          Precisa de ajuda? Ligue para a gente: <a href="tel:+554936223137">(49) 3622-3137</a>
        </p>
      </div>
    </main>
  );
}
