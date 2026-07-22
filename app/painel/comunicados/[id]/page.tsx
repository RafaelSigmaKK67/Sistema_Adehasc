'use client';

// Documento oficial do comunicado — papel timbrado da ADEHASC, pronto para
// imprimir ou salvar em PDF.

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import { formatarCpf, formatarData } from '@/lib/formatar';

type Comunicado = { id: number; title: string; body: string; author: string; created_at: string };
type Morador = { full_name: string; cpf: string; protocol: string };

export default function PaginaComunicado() {
  const parametros = useParams<{ id: string }>();
  const router = useRouter();
  const [comunicado, setComunicado] = useState<Comunicado | null>(null);
  const [morador, setMorador] = useState<Morador | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then(async (resposta) => {
        if (resposta.status === 401) {
          router.replace('/entrar');
          return;
        }
        if (!resposta.ok) throw new Error();
        const dados = await resposta.json();
        const encontrado = (dados.comunicados as Comunicado[]).find(
          (c) => String(c.id) === parametros.id
        );
        if (!encontrado) {
          setErro('Este comunicado não foi encontrado.');
          return;
        }
        setComunicado(encontrado);
        setMorador(dados.morador);
      })
      .catch(() => setErro('Não conseguimos carregar o documento. Tente de novo.'));
  }, [parametros.id, router]);

  if (erro) {
    return (
      <main className="pagina-entrar">
        <div className="container-estreito">
          <div className="aviso aviso-erro" role="alert">
            {erro}
          </div>
          <Link className="botao botao-contorno" href="/painel">
            ← Voltar para o meu painel
          </Link>
        </div>
      </main>
    );
  }

  if (!comunicado || !morador) {
    return (
      <main className="pagina-entrar">
        <div className="container-estreito">
          <p role="status">Carregando o documento…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="pagina-entrar">
      <div className="container-estreito">
        <div className="acoes-linha nao-imprimir mb-2">
          <Link className="botao botao-suave botao-mini" href="/painel">
            ← Voltar para o meu painel
          </Link>
          <button
            type="button"
            className="botao botao-contorno botao-mini"
            onClick={() => window.print()}
          >
            🖨 Imprimir ou salvar em PDF
          </button>
        </div>

        <article className="documento-oficial">
          <header className="documento-topo">
            <Logo altura={44} />
            <div>
              <div className="documento-tipo">Comunicado oficial</div>
              <div className="documento-data">{formatarData(comunicado.created_at)}</div>
            </div>
          </header>
          <p className="documento-para">
            Para: <strong>{morador.full_name}</strong> · CPF {formatarCpf(morador.cpf)} ·
            Protocolo {morador.protocol}
          </p>
          <h1 style={{ fontSize: '1.2rem' }}>{comunicado.title}</h1>
          <div className="documento-corpo">{comunicado.body}</div>
          <footer className="documento-assinatura">
            {comunicado.author} — ADEHASC · CNPJ 78.486.875/0001-32
            <br />
            Avenida Salgado Filho, nº 559, Centro · (49) 3622-3137 · contato@adehasc.com.br
          </footer>
        </article>
      </div>
    </main>
  );
}
