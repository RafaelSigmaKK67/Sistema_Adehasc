import Link from 'next/link';
import Logo, { CasaAdehasc } from '@/components/Logo';
import { DOCUMENTOS_PADRAO, ETAPAS } from '@/lib/etapas';

export default function PaginaInicial() {
  return (
    <>
      <header className="cabecalho">
        <div className="container cabecalho-linha">
          <Logo comTagline />
          <div className="cabecalho-acoes">
            <Link className="botao botao-contorno" href="/entrar">
              Entrar
            </Link>
            <Link className="botao botao-primario" href="/cadastro">
              Fazer meu cadastro
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-grade">
            <div>
              <span className="selo-verde">✓ Associação sem fins lucrativos — desde 1988</span>
              <h1>Regularize o seu imóvel e receba a escritura no seu nome</h1>
              <p className="hero-subtitulo">
                A ADEHASC ajuda você a deixar o seu imóvel legal, com escritura no seu nome.
                Faça o cadastro pela internet e acompanhe cada passo do seu processo, com calma
                e sem complicação.
              </p>
              <div className="hero-botoes">
                <Link className="botao botao-primario" href="/cadastro">
                  Fazer meu cadastro
                </Link>
                <Link className="botao botao-contorno" href="/entrar">
                  Acompanhar meu processo
                </Link>
              </div>
            </div>
            <div className="hero-figura" aria-hidden="true">
              <CasaAdehasc tamanho={260} />
            </div>
          </div>
        </section>

        <section className="secao secao-alterna" id="como-funciona" aria-labelledby="titulo-como-funciona">
          <div className="container">
            <h2 className="secao-titulo" id="titulo-como-funciona">
              Como funciona
            </h2>
            <p className="secao-subtitulo">
              O seu processo passa por 7 etapas. Você acompanha tudo pelo seu painel,
              do primeiro cadastro até a entrega do título de propriedade.
            </p>
            <div className="grade-etapas">
              {ETAPAS.map((etapa) => (
                <article className="cartao cartao-etapa" key={etapa.numero}>
                  <span
                    className={`circulo-numero ${etapa.numero === 7 ? 'circulo-numero-verde' : ''}`}
                    aria-hidden="true"
                  >
                    {etapa.numero}
                  </span>
                  <div>
                    <h3>{etapa.titulo}</h3>
                    <p>{etapa.texto}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="secao" id="documentos" aria-labelledby="titulo-documentos">
          <div className="container">
            <h2 className="secao-titulo" id="titulo-documentos">
              Documentos necessários
            </h2>
            <p className="secao-subtitulo">
              Separe estes documentos com calma. Se faltar algum, não tem problema:
              a nossa equipe orienta você durante o processo.
            </p>
            <ul className="lista-documentos">
              {DOCUMENTOS_PADRAO.map((documento) => (
                <li key={documento}>
                  <span className="visto-verde" aria-hidden="true">
                    ✓
                  </span>
                  {documento}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="secao secao-alterna" aria-labelledby="titulo-ja-tem">
          <div className="container texto-centro">
            <h2 id="titulo-ja-tem">Já tem cadastro?</h2>
            <p className="secao-subtitulo">
              Entre com o seu CPF e a sua senha para ver em que etapa está o seu processo.
            </p>
            <Link className="botao botao-contorno" href="/entrar">
              Acompanhar meu processo
            </Link>
          </div>
        </section>
      </main>

      <footer className="rodape">
        <div className="container">
          <div className="rodape-grade">
            <div>
              <h3>ADEHASC</h3>
              <p>
                Associação para o Desenvolvimento Habitacional Sustentável de Santa Catarina.
                Promovemos o acesso à moradia digna para famílias de baixa renda por meio de
                regularização fundiária, habitação urbana e rural, em Santa Catarina, Paraná,
                Rio Grande do Sul e Mato Grosso do Sul.
              </p>
            </div>
            <div>
              <h3>Fale com a gente</h3>
              <ul>
                <li>
                  ☎ <a href="tel:+554936223137">(49) 3622-3137</a>
                </li>
                <li>
                  📱 <a href="tel:+5549985031080">(49) 98503-1080</a>
                </li>
                <li>
                  ✉ <a href="mailto:contato@adehasc.com.br">contato@adehasc.com.br</a>
                </li>
                <li>
                  ✉ <a href="mailto:admadehasc@gmail.com">admadehasc@gmail.com</a>
                </li>
              </ul>
            </div>
            <div>
              <h3>Onde estamos</h3>
              <p>
                Avenida Salgado Filho, nº 559, Centro
                <br />
                CNPJ 78.486.875/0001-32
              </p>
              <p>
                <a href="https://adehasc.com.br" target="_blank" rel="noopener noreferrer">
                  adehasc.com.br
                </a>
              </p>
            </div>
          </div>
          <div className="rodape-final">
            <span>© {new Date().getFullYear()} ADEHASC — Todos os direitos reservados.</span>
            <span>
              <Link href="/privacidade">Privacidade</Link>
              {' · '}
              <Link href="/admin/entrar">Área administrativa</Link>
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
