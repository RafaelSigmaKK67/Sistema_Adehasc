'use client';

// Conversa da equipe com um morador — a resposta chega no painel dele e,
// se ele ativou, como notificação no celular.

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { formatarDataHora } from '@/lib/formatar';
import {
  AnexoMeta,
  AnexoNoBalao,
  AnexoParaEnvio,
  prepararArquivo,
} from '@/components/ChatAnexo';

type Mensagem = {
  id: number;
  remetente: 'morador' | 'equipe';
  texto: string;
  criada_em: string;
  anexo: AnexoMeta | null;
};
type MoradorResumo = { id: number; nome: string; protocolo: string };

const INTERVALO_ATUALIZACAO_MS = 8000;

export default function PaginaConversaAdmin() {
  const parametros = useParams<{ id: string }>();
  const router = useRouter();
  const [morador, setMorador] = useState<MoradorResumo | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[] | null>(null);
  const [texto, setTexto] = useState('');
  const [anexoPendente, setAnexoPendente] = useState<AnexoParaEnvio | null>(null);
  const [preparandoAnexo, setPreparandoAnexo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const fimRef = useRef<HTMLDivElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const totalAnterior = useRef(0);

  async function aoEscolherArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro('');
    setPreparandoAnexo(true);
    const resultado = await prepararArquivo(arquivo);
    setPreparandoAnexo(false);
    if ('erro' in resultado) {
      setErro(resultado.erro);
      return;
    }
    setAnexoPendente(resultado.anexo);
  }

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/admin/residents/${parametros.id}/mensagens`, {
        cache: 'no-store',
      });
      if (resposta.status === 401) {
        router.replace('/admin/entrar');
        return;
      }
      if (resposta.status === 404) {
        setErro('Este cadastro não existe mais.');
        return;
      }
      if (!resposta.ok) return;
      const dados = await resposta.json();
      setMorador(dados.morador);
      setMensagens(dados.mensagens);
    } catch {
      /* tenta no próximo ciclo */
    }
  }, [parametros.id, router]);

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
    if ((!conteudo && !anexoPendente) || enviando) return;
    setErro('');
    setEnviando(true);
    try {
      const resposta = await fetch(`/api/admin/residents/${parametros.id}/mensagens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: conteudo, anexo: anexoPendente || undefined }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro((dados && dados.erro) || 'Não conseguimos enviar. Tente de novo.');
        return;
      }
      setTexto('');
      setAnexoPendente(null);
      if (arquivoRef.current) arquivoRef.current.value = '';
      setMensagens((atuais) => [...(atuais || []), dados.mensagem]);
    } catch {
      setErro('Não conseguimos falar com o servidor. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <div className="ficha-topo">
        <div>
          <h1 className="sem-margem">{morador ? morador.nome : 'Conversa'}</h1>
          {morador && (
            <p className="texto-suave sem-margem">
              Protocolo {morador.protocolo} ·{' '}
              <Link href={`/admin/moradores/${morador.id}`}>abrir a ficha</Link>
            </p>
          )}
        </div>
        <Link className="botao botao-suave botao-mini" href="/admin/mensagens">
          ← Todas as conversas
        </Link>
      </div>

      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}

      <div className="cartao chat-cartao">
        <div className="chat-mensagens" aria-live="polite">
          {mensagens === null ? (
            <p role="status" className="texto-suave">
              Carregando a conversa…
            </p>
          ) : mensagens.length === 0 ? (
            <p className="texto-suave">
              Nenhuma mensagem ainda. Escreva abaixo para começar a conversa com o morador.
            </p>
          ) : (
            mensagens.map((mensagem) => (
              <div
                key={mensagem.id}
                className={`balao ${mensagem.remetente === 'equipe' ? 'balao-meu' : 'balao-equipe'}`}
              >
                <span className="balao-autor">
                  {mensagem.remetente === 'equipe' ? 'Você (equipe)' : morador?.nome || 'Morador'}
                </span>
                {mensagem.anexo && <AnexoNoBalao anexo={mensagem.anexo} />}
                {mensagem.texto && <p className="balao-texto">{mensagem.texto}</p>}
                <span className="balao-hora">{formatarDataHora(mensagem.criada_em)}</span>
              </div>
            ))
          )}
          <div ref={fimRef} />
        </div>

        {anexoPendente && (
          <div className="anexo-pendente" role="status">
            📎 {anexoPendente.nome}
            <button
              type="button"
              className="anexo-remover"
              onClick={() => {
                setAnexoPendente(null);
                if (arquivoRef.current) arquivoRef.current.value = '';
              }}
              aria-label="Remover o anexo"
            >
              ✕
            </button>
          </div>
        )}

        <form className="chat-envio" onSubmit={enviar}>
          <input
            ref={arquivoRef}
            id="anexo-admin"
            type="file"
            accept="image/*,application/pdf"
            className="escondido-visual"
            onChange={(e) => aoEscolherArquivo(e.target.files?.[0])}
          />
          <label
            htmlFor="anexo-admin"
            className="botao-anexar"
            title="Enviar foto ou PDF"
            aria-label="Anexar foto ou PDF"
          >
            {preparandoAnexo ? '…' : '📎'}
          </label>
          <label htmlFor="resposta" className="escondido-visual">
            Escreva a resposta
          </label>
          <input
            id="resposta"
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva a resposta…"
            maxLength={2000}
            autoComplete="off"
          />
          <button
            type="submit"
            className="botao botao-primario"
            disabled={enviando || preparandoAnexo || (!texto.trim() && !anexoPendente)}
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
