import Link from 'next/link';
import Logo from '@/components/Logo';

export const metadata = { title: 'Esqueci minha senha — ADEHASC' };

export default function PaginaEsqueciSenha() {
  return (
    <main className="pagina-entrar">
      <div className="container-estreito">
        <p className="texto-centro">
          <Link href="/">
            <Logo tamanho={72} vertical comTagline />
          </Link>
        </p>
        <div className="cartao">
          <h1>Esqueceu a sua senha?</h1>
          <p>Fique tranquilo, isso acontece. É fácil de resolver:</p>
          <div className="aviso aviso-info">
            <strong>Ligue para a ADEHASC no <a href="tel:+554936223137">(49) 3622-3137</a></strong>{' '}
            que a nossa equipe gera uma senha temporária para você.
          </div>
          <p>
            Com a senha temporária, você entra no sistema e cria uma senha nova, do seu jeito.
          </p>
          <p className="sem-margem">
            Você também pode falar com a gente pelo WhatsApp:{' '}
            <a href="tel:+5549985031080">(49) 98503-1080</a>.
          </p>
        </div>
        <p className="texto-centro">
          <Link className="botao botao-contorno" href="/entrar">
            ← Voltar para a página de entrada
          </Link>
        </p>
      </div>
    </main>
  );
}
