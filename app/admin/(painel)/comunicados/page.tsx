'use client';

// Comunicados: o admin parte de um modelo padrão salvo, faz só as atualizações
// no texto, confere os destinatários e envia. Cada morador recebe o documento
// personalizado ({nome}, {protocolo}, {etapa}) no próprio painel.

import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ETAPAS } from '@/lib/etapas';
import { formatarDataHora } from '@/lib/formatar';

type Lote = { lote_id: string; titulo: string; criado_em: string; total: number };

export default function PaginaComunicados() {
  const router = useRouter();
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [carregado, setCarregado] = useState(false);

  const [destinoTipo, setDestinoTipo] = useState<'todos' | 'etapa' | 'municipio' | 'morador'>('todos');
  const [destinoEtapa, setDestinoEtapa] = useState('1');
  const [destinoMunicipio, setDestinoMunicipio] = useState('');
  const [destinoMorador, setDestinoMorador] = useState('');
  const [municipios, setMunicipios] = useState<string[]>([]);

  const [contagem, setContagem] = useState<{ total: number; amostra: string[] } | null>(null);
  const [conferindo, setConferindo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [salvandoModelo, setSalvandoModelo] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [lotes, setLotes] = useState<Lote[]>([]);

  const carregarLotes = useCallback(async () => {
    try {
      const resposta = await fetch('/api/admin/comunicados', { cache: 'no-store' });
      if (resposta.status === 401) {
        router.replace('/admin/entrar');
        return;
      }
      if (resposta.ok) setLotes((await resposta.json()).lotes);
    } catch {
      /* histórico é informativo */
    }
  }, [router]);

  useEffect(() => {
    fetch('/api/admin/template', { cache: 'no-store' })
      .then(async (resposta) => {
        if (resposta.status === 401) {
          router.replace('/admin/entrar');
          return;
        }
        if (resposta.ok) {
          const dados = await resposta.json();
          setTitulo(dados.modelo.titulo);
          setCorpo(dados.modelo.corpo);
        }
      })
      .catch(() => undefined)
      .finally(() => setCarregado(true));

    fetch('/api/admin/residents?pagina=1', { cache: 'no-store' })
      .then(async (resposta) => {
        if (resposta.ok) setMunicipios((await resposta.json()).municipios);
      })
      .catch(() => undefined);

    carregarLotes();

    // Vindo da ficha do morador: /admin/comunicados?para=ADH-2026-00001
    const para = new URLSearchParams(window.location.search).get('para');
    if (para) {
      setDestinoTipo('morador');
      setDestinoMorador(para);
    }
  }, [router, carregarLotes]);

  function destinoAtual() {
    if (destinoTipo === 'etapa') return { tipo: 'etapa', valor: destinoEtapa };
    if (destinoTipo === 'municipio') return { tipo: 'municipio', valor: destinoMunicipio };
    if (destinoTipo === 'morador') return { tipo: 'morador', valor: destinoMorador.trim() };
    return { tipo: 'todos' };
  }

  function limparConferencia() {
    setContagem(null);
    setAviso('');
    setErro('');
  }

  async function conferir(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setAviso('');
    setConferindo(true);
    try {
      const resposta = await fetch('/api/admin/comunicados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, corpo, destino: destinoAtual(), somente_contar: true }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro((dados && dados.erro) || 'Não conseguimos conferir os destinatários.');
        return;
      }
      setContagem({ total: dados.total, amostra: dados.amostra });
    } catch {
      setErro('Não conseguimos falar com o servidor. Tente de novo.');
    } finally {
      setConferindo(false);
    }
  }

  async function enviar() {
    setErro('');
    setAviso('');
    setEnviando(true);
    try {
      const resposta = await fetch('/api/admin/comunicados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, corpo, destino: destinoAtual() }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro((dados && dados.erro) || 'Não conseguimos enviar o comunicado.');
        return;
      }
      setAviso(`Comunicado enviado para ${dados.total} morador(es)! Cada um já vê o documento no próprio painel.`);
      setContagem(null);
      await carregarLotes();
    } catch {
      setErro('Não conseguimos falar com o servidor. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  async function salvarModelo() {
    setErro('');
    setAviso('');
    setSalvandoModelo(true);
    try {
      const resposta = await fetch('/api/admin/template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, corpo }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro((dados && dados.erro) || 'Não conseguimos salvar o modelo.');
        return;
      }
      setAviso('Modelo padrão salvo! Da próxima vez, o comunicado já começa com este texto.');
    } catch {
      setErro('Não conseguimos falar com o servidor. Tente de novo.');
    } finally {
      setSalvandoModelo(false);
    }
  }

  return (
    <div>
      <h1>Comunicados</h1>
      <p className="texto-suave">
        Escreva o documento uma vez, escolha para quem enviar e pronto: cada morador recebe
        o comunicado personalizado no painel dele, junto com um aviso na linha do tempo.
      </p>

      {aviso && (
        <div className="aviso aviso-ok" role="status">
          {aviso}
        </div>
      )}
      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}

      <div className="painel-grade">
        <div>
          <section className="cartao" aria-labelledby="titulo-documento">
            <h2 id="titulo-documento">Documento</h2>
            <p className="campo-dica">
              Os campos <code>{'{nome}'}</code>, <code>{'{protocolo}'}</code> e{' '}
              <code>{'{etapa}'}</code> são trocados automaticamente pelos dados de cada
              morador.
            </p>
            <div className="campo">
              <label htmlFor="com-titulo">Título</label>
              <input
                id="com-titulo"
                value={titulo}
                onChange={(e) => {
                  setTitulo(e.target.value);
                  limparConferencia();
                }}
                disabled={!carregado}
              />
            </div>
            <div className="campo">
              <label htmlFor="com-corpo">Texto do comunicado</label>
              <textarea
                id="com-corpo"
                rows={12}
                value={corpo}
                onChange={(e) => {
                  setCorpo(e.target.value);
                  limparConferencia();
                }}
                disabled={!carregado}
                style={{ minHeight: 260 }}
              />
            </div>
            <div className="acoes-linha">
              <button
                type="button"
                className="botao botao-suave botao-mini"
                onClick={salvarModelo}
                disabled={salvandoModelo || !carregado}
              >
                {salvandoModelo ? 'Salvando…' : 'Salvar como modelo padrão'}
              </button>
            </div>
          </section>
        </div>

        <div>
          <section className="cartao" aria-labelledby="titulo-destino">
            <h2 id="titulo-destino">Para quem enviar</h2>
            <form onSubmit={conferir}>
              <div className="grupo-radio" role="radiogroup" aria-label="Destinatários">
                {[
                  { valor: 'todos', rotulo: 'Todos os moradores' },
                  { valor: 'etapa', rotulo: 'Por etapa' },
                  { valor: 'municipio', rotulo: 'Por município' },
                  { valor: 'morador', rotulo: 'Um morador' },
                ].map((opcao) => (
                  <label key={opcao.valor}>
                    <input
                      type="radio"
                      name="destino"
                      value={opcao.valor}
                      checked={destinoTipo === opcao.valor}
                      onChange={() => {
                        setDestinoTipo(opcao.valor as typeof destinoTipo);
                        limparConferencia();
                      }}
                    />
                    {opcao.rotulo}
                  </label>
                ))}
              </div>

              {destinoTipo === 'etapa' && (
                <div className="campo mt-2">
                  <label htmlFor="destino-etapa">Etapa</label>
                  <select
                    id="destino-etapa"
                    value={destinoEtapa}
                    onChange={(e) => {
                      setDestinoEtapa(e.target.value);
                      limparConferencia();
                    }}
                  >
                    {ETAPAS.map((etapa) => (
                      <option key={etapa.numero} value={etapa.numero}>
                        {etapa.numero}. {etapa.titulo}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {destinoTipo === 'municipio' && (
                <div className="campo mt-2">
                  <label htmlFor="destino-municipio">Município</label>
                  <select
                    id="destino-municipio"
                    value={destinoMunicipio}
                    onChange={(e) => {
                      setDestinoMunicipio(e.target.value);
                      limparConferencia();
                    }}
                  >
                    <option value="">Escolha o município</option>
                    {municipios.map((cidade) => (
                      <option key={cidade} value={cidade}>
                        {cidade}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {destinoTipo === 'morador' && (
                <div className="campo mt-2">
                  <label htmlFor="destino-morador">Protocolo ou CPF do morador</label>
                  <input
                    id="destino-morador"
                    value={destinoMorador}
                    onChange={(e) => {
                      setDestinoMorador(e.target.value);
                      limparConferencia();
                    }}
                    placeholder="Ex.: ADH-2026-00008 ou 123.456.789-09"
                  />
                </div>
              )}

              <button
                type="submit"
                className="botao botao-contorno botao-largo mt-2"
                disabled={conferindo}
              >
                {conferindo ? 'Conferindo…' : 'Conferir destinatários'}
              </button>
            </form>

            {contagem && (
              <div className="mt-2">
                <div className="aviso aviso-info">
                  Vai para <strong>{contagem.total} morador(es)</strong>
                  {contagem.amostra.length > 0 && (
                    <>
                      {' '}
                      — por exemplo: {contagem.amostra.join(', ')}
                      {contagem.total > contagem.amostra.length ? '…' : ''}
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className="botao botao-primario botao-largo"
                  onClick={enviar}
                  disabled={enviando}
                >
                  {enviando ? 'Enviando…' : `Enviar para ${contagem.total} morador(es)`}
                </button>
              </div>
            )}
          </section>

          <section className="cartao" aria-labelledby="titulo-historico">
            <h2 id="titulo-historico">Histórico de envios</h2>
            {lotes.length === 0 ? (
              <p className="texto-suave sem-margem">Nenhum comunicado enviado ainda.</p>
            ) : (
              <div className="tabela-caixa">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th scope="col">Comunicado</th>
                      <th scope="col">Enviado em</th>
                      <th scope="col">Destinatários</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotes.map((lote) => (
                      <tr key={lote.lote_id}>
                        <td>{lote.titulo}</td>
                        <td>{formatarDataHora(lote.criado_em)}</td>
                        <td>{lote.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
