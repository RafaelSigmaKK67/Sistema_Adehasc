'use client';

// Caixa de entrada da equipe: todas as conversas com os moradores,
// com destaque para as mensagens ainda não respondidas.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { formatarDataHora } from '@/lib/formatar';

type Conversa = {
  resident_id: number;
  nome: string;
  protocolo: string;
  ultima_mensagem: string;
  remetente_ultima: 'morador' | 'equipe';
  ultima_em: string;
  nao_lidas: number;
};

const INTERVALO_ATUALIZACAO_MS = 15000;

export default function PaginaMensagens() {
  const router = useRouter();
  const [conversas, setConversas] = useState<Conversa[] | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch('/api/admin/conversas', { cache: 'no-store' });
      if (resposta.status === 401) {
        router.replace('/admin/entrar');
        return;
      }
      if (!resposta.ok) throw new Error();
      setConversas((await resposta.json()).conversas);
    } catch {
      setErro('Não conseguimos carregar as conversas. Recarregue a página.');
    }
  }, [router]);

  useEffect(() => {
    carregar();
    const intervalo = setInterval(carregar, INTERVALO_ATUALIZACAO_MS);
    return () => clearInterval(intervalo);
  }, [carregar]);

  return (
    <div>
      <h1>Mensagens</h1>
      <p className="texto-suave">
        Conversas com os moradores. As marcadas em vermelho têm mensagem esperando resposta.
      </p>

      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}

      <section className="cartao" aria-label="Conversas">
        {conversas === null ? (
          <p role="status" className="sem-margem">
            Carregando…
          </p>
        ) : conversas.length === 0 ? (
          <p className="texto-suave sem-margem">
            Nenhuma conversa ainda. Quando um morador escrever pelo painel dele, aparece aqui.
          </p>
        ) : (
          <ul className="lista-conversas">
            {conversas.map((conversa) => (
              <li key={conversa.resident_id}>
                <Link href={`/admin/mensagens/${conversa.resident_id}`} className="conversa-link">
                  <span className="conversa-topo">
                    <strong>{conversa.nome}</strong>
                    {conversa.nao_lidas > 0 && (
                      <span className="selo-nao-lidas">{conversa.nao_lidas}</span>
                    )}
                    <span className="texto-suave conversa-quando">
                      {formatarDataHora(conversa.ultima_em)}
                    </span>
                  </span>
                  <span className="texto-suave conversa-previa">
                    {conversa.remetente_ultima === 'equipe' ? 'Equipe: ' : ''}
                    {conversa.ultima_mensagem.slice(0, 90)}
                    {conversa.ultima_mensagem.length > 90 ? '…' : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
