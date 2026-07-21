import Link from 'next/link';
import Logo from '@/components/Logo';

export const metadata = { title: 'Como cuidamos dos seus dados — ADEHASC' };

export default function PaginaPrivacidade() {
  return (
    <main className="pagina-entrar">
      <div className="container-estreito">
        <p className="texto-centro">
          <Link href="/">
            <Logo tamanho={72} vertical comTagline />
          </Link>
        </p>
        <div className="cartao">
          <h1>Como cuidamos dos seus dados</h1>
          <p>
            Esta página explica, em palavras simples, como a ADEHASC usa as informações que
            você escreve no cadastro. É o nosso compromisso com você e com a Lei Geral de
            Proteção de Dados (LGPD).
          </p>
          <h2>Para que usamos os seus dados</h2>
          <p>
            Usamos os seus dados <strong>somente para o seu processo de regularização
            fundiária</strong>: analisar o cadastro, conferir documentos, preparar o projeto e
            registrar o seu imóvel. Nada além disso.
          </p>
          <h2>O que nunca fazemos</h2>
          <p>
            Nunca vendemos os seus dados e nunca passamos as suas informações para empresas de
            propaganda. Só compartilhamos o necessário com órgãos públicos envolvidos no seu
            processo, como a Prefeitura e o Cartório de Registro de Imóveis.
          </p>
          <h2>Como protegemos as suas informações</h2>
          <p>
            A sua senha é guardada de forma embaralhada (nem a nossa equipe consegue ler) e o
            acesso aos dados é restrito à equipe da ADEHASC.
          </p>
          <h2>Os seus direitos</h2>
          <p>
            Você pode pedir para ver, corrigir ou apagar os seus dados quando quiser. É só
            ligar para <a href="tel:+554936223137">(49) 3622-3137</a> ou escrever para{' '}
            <a href="mailto:contato@adehasc.com.br">contato@adehasc.com.br</a>.
          </p>
        </div>
        <p className="texto-centro">
          <Link className="botao botao-contorno" href="/">
            ← Voltar para o início
          </Link>
        </p>
      </div>
    </main>
  );
}
