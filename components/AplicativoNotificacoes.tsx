'use client';

// Cartão do painel do morador: instalar o aplicativo no celular e ativar as
// notificações push (Web Push). No iPhone, o push exige o app instalado
// pela opção "Adicionar à Tela de Início".

import { useEffect, useState } from 'react';

type EventoInstalacao = Event & { prompt: () => Promise<void> };

function base64ParaUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const preenchimento = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalizado = (base64 + preenchimento).replace(/-/g, '+').replace(/_/g, '/');
  const bruto = window.atob(normalizado);
  const saida = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i++) saida[i] = bruto.charCodeAt(i);
  return saida;
}

export default function AplicativoNotificacoes() {
  const [suportaPush, setSuportaPush] = useState(false);
  const [chave, setChave] = useState<string | null>(null);
  const [ativas, setAtivas] = useState(false);
  const [trabalhando, setTrabalhando] = useState(false);
  const [erro, setErro] = useState('');
  const [eventoInstalar, setEventoInstalar] = useState<EventoInstalacao | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [ehIphone, setEhIphone] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setInstalado(standalone);
    setEhIphone(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const suporta = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSuportaPush(suporta);

    fetch('/api/push/chave')
      .then((r) => r.json())
      .then((dados) => setChave(dados.chave))
      .catch(() => undefined);

    if (suporta) {
      // Se este aparelho já tem inscrição, reenviamos ao servidor: assim ela
      // passa a valer para quem está logado AGORA (celular compartilhado em
      // família não manda as notificações de um morador para o outro).
      navigator.serviceWorker
        .register('/sw.js')
        .then((registro) => registro.pushManager.getSubscription())
        .then(async (inscricao) => {
          if (!inscricao) {
            setAtivas(false);
            return;
          }
          const resposta = await fetch('/api/me/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inscricao: inscricao.toJSON() }),
          });
          setAtivas(resposta.ok);
        })
        .catch(() => undefined);
    }

    const aoPoderInstalar = (evento: Event) => {
      evento.preventDefault();
      setEventoInstalar(evento as EventoInstalacao);
    };
    window.addEventListener('beforeinstallprompt', aoPoderInstalar);
    return () => window.removeEventListener('beforeinstallprompt', aoPoderInstalar);
  }, []);

  async function ativarNotificacoes() {
    setErro('');
    setTrabalhando(true);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== 'granted') {
        setErro('O celular não deu permissão. Se mudou de ideia, libere as notificações nas configurações do navegador.');
        return;
      }
      const registro = await navigator.serviceWorker.register('/sw.js');
      const pronto = await navigator.serviceWorker.ready;
      const inscricao =
        (await pronto.pushManager.getSubscription()) ||
        (await pronto.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ParaUint8Array(chave as string),
        }));
      const resposta = await fetch('/api/me/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inscricao: inscricao.toJSON() }),
      });
      if (!resposta.ok) throw new Error();
      setAtivas(true);
      void registro;
    } catch {
      setErro('Não conseguimos ativar as notificações neste aparelho. Tente de novo.');
    } finally {
      setTrabalhando(false);
    }
  }

  async function desativarNotificacoes() {
    setErro('');
    setTrabalhando(true);
    try {
      const pronto = await navigator.serviceWorker.ready;
      const inscricao = await pronto.pushManager.getSubscription();
      if (inscricao) {
        await fetch('/api/me/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: inscricao.endpoint }),
        }).catch(() => undefined);
        await inscricao.unsubscribe();
      }
      setAtivas(false);
    } catch {
      setErro('Não conseguimos desativar agora. Tente de novo.');
    } finally {
      setTrabalhando(false);
    }
  }

  async function instalarAplicativo() {
    if (!eventoInstalar) return;
    await eventoInstalar.prompt();
    setEventoInstalar(null);
  }

  return (
    <section className="cartao" aria-labelledby="titulo-aplicativo">
      <h2 id="titulo-aplicativo">Aplicativo no celular</h2>

      {instalado ? (
        <p className="texto-suave">✓ Você já está usando o aplicativo instalado.</p>
      ) : eventoInstalar ? (
        <>
          <p className="texto-suave">
            Instale o aplicativo da ADEHASC para abrir direto da tela do celular.
          </p>
          <button
            type="button"
            className="botao botao-contorno botao-mini mb-2"
            onClick={instalarAplicativo}
          >
            📲 Instalar aplicativo
          </button>
        </>
      ) : ehIphone ? (
        <p className="texto-suave">
          No iPhone: toque no botão <strong>Compartilhar</strong> do Safari e escolha{' '}
          <strong>Adicionar à Tela de Início</strong> para instalar o aplicativo.
        </p>
      ) : (
        <p className="texto-suave">
          No celular, use a opção <strong>Adicionar à tela inicial</strong> do navegador para
          instalar o aplicativo.
        </p>
      )}

      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}

      {chave && suportaPush ? (
        ativas ? (
          <>
            <p className="texto-suave sem-margem mb-2">
              🔔 <strong>Notificações ativadas.</strong> Você recebe um aviso no celular
              quando o processo andar ou a equipe mandar mensagem.
            </p>
            <button
              type="button"
              className="botao botao-suave botao-mini"
              onClick={desativarNotificacoes}
              disabled={trabalhando}
            >
              Desativar notificações
            </button>
          </>
        ) : (
          <>
            <p className="texto-suave">
              Ative para receber um aviso no celular — como uma mensagem — sempre que o seu
              processo andar ou a equipe falar com você.
              {ehIphone && !instalado && ' No iPhone, primeiro instale o aplicativo (passo acima).'}
            </p>
            <button
              type="button"
              className="botao botao-primario botao-mini"
              onClick={ativarNotificacoes}
              disabled={trabalhando || (ehIphone && !instalado)}
            >
              {trabalhando ? 'Ativando…' : '🔔 Ativar notificações'}
            </button>
          </>
        )
      ) : (
        chave === null && (
          <p className="texto-suave sem-margem">
            As notificações no celular ainda não foram configuradas pela equipe técnica.
          </p>
        )
      )}
    </section>
  );
}
