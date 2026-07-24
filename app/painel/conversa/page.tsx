'use client';

// Conversa do morador com a equipe da ADEHASC — mensagens em balões,
// atualizadas sozinhas de tempos em tempos.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { formatarDataHora } from '@/lib/formatar';

type Mensagem = { id: number; remetente: 'morador' | 'equipe'; texto: string; criada_em: string };

const INTERVALO_ATUALIZACAO_MS = 8000;

export default function PaginaConversa() {
  const router = useRouter();
  const [mensagens, setMensagens] = useState<Mensagem[] | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const fimRef = useRef<HTMLDivElement>(null);
  const totalAnterior = useRef(0);

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch('/api/me/mensagens', { cache: 'no-store' });
      if (resposta.status === 401) {
        router.replace('/entrar');
        return;
      }
      if (!resposta.ok) return;
      const dados = await resposta.json();
      setMensagens(dados.mensagens);
    } catch {
      /* tenta de novo no próximo ciclo */
    }
  }, [router]);

  useEffect(() => {
    carregar();
    const intervalo = setInterval(carregar, INTERVALO_ATUALIZACAO_MS);
    return () => clearInterval(intervalo);
  }, [carregar]);

  useEffect(() => {
    if (mensagens && mensagens.length > totalAnterior.current) {
      fimRef.current?.scrollIntoView({ block: 'end' });
      totalAnterior.current = mensagens.length;
    }
  }, [mensagens]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;
    setErro('');
    setEnviando(true);
    try {
      const resposta = await fetch('/api/me/mensagens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: conteudo }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro((dados && dados.erro) || 'Não conseguimos enviar. Tente de novo.');
        return;
      }
      setTexto('');
      setMensagens((atuais) => [...(atuais || []), dados.mensagem]);
    } catch {
      setErro('Não conseguimos falar com o servidor. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="pagina-entrar">
      <div className="container-estreito">
        <div className="ficha-topo">
          <h1 className="sem-margem">Conversa com a equipe</h1>
          <Link className="botao botao-suave botao-mini" href="/painel">
            ← Voltar ao painel
          </Link>
        </div>

        <div className="cartao chat-cartao">
          <div className="chat-mensagens" aria-live="polite">
            {mensagens === null ? (
              <p role="status" className="texto-suave">
                Carregando a conversa…
              </p>
            ) : mensagens.length === 0 ? (
              <p className="texto-suave">
                Nenhuma mensagem por enquanto. Escreva abaixo a sua dúvida que a nossa equipe
                responde por aqui. 😊
              </p>
            ) : (
              mensagens.map((mensagem) => (
                <div
                  key={mensagem.id}
                  className={`balao ${mensagem.remetente === 'morador' ? 'balao-meu' : 'balao-equipe'}`}
                >
                  <span className="balao-autor">
                    {mensagem.remetente === 'morador' ? 'Você' : 'Equipe ADEHASC'}
                  </span>
                  <p className="balao-texto">{mensagem.texto}</p>
                  <span className="balao-hora">{formatarDataHora(mensagem.criada_em)}</span>
                </div>
              ))
            )}
            <div ref={fimRef} />
          </div>

          {erro && (
            <div className="aviso aviso-erro" role="alert">
              {erro}
            </div>
          )}

          <form className="chat-envio" onSubmit={enviar}>
            <label htmlFor="mensagem" className="escondido-visual">
              Escreva a sua mensagem
            </label>
            <input
              id="mensagem"
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escreva a sua mensagem…"
              maxLength={2000}
              autoComplete="off"
            />
            <button type="submit" className="botao botao-primario" disabled={enviando || !texto.trim()}>
              Enviar
            </button>
          </form>
        </div>

        <p className="texto-centro texto-suave">
          Prefere falar por telefone? <a href="tel:+554936223137">(49) 3622-3137</a>
        </p>
      </div>
    </main>
  );
}
