'use client';

// Lista de moradores: busca, filtros, paginação e exportação em CSV.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ETAPAS, etapaInfo } from '@/lib/etapas';
import { formatarCpf, formatarData } from '@/lib/formatar';

const POR_PAGINA = 25;

type MoradorLinha = {
  id: number;
  protocol: string;
  full_name: string;
  cpf: string;
  city: string;
  stage: number;
  created_at: string;
};

type Resposta = {
  moradores: MoradorLinha[];
  total: number;
  pagina: number;
  paginas: number;
  municipios: string[];
};

export default function PaginaMoradores() {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [etapa, setEtapa] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const parametros = new URLSearchParams();
      if (buscaAplicada) parametros.set('q', buscaAplicada);
      if (etapa) parametros.set('etapa', etapa);
      if (municipio) parametros.set('municipio', municipio);
      parametros.set('pagina', String(pagina));
      const resposta = await fetch(`/api/admin/residents?${parametros}`, { cache: 'no-store' });
      if (resposta.status === 401) {
        router.replace('/admin/entrar');
        return;
      }
      if (!resposta.ok) throw new Error();
      setDados(await resposta.json());
    } catch {
      setErro('Não conseguimos carregar a lista. Recarregue a página.');
    } finally {
      setCarregando(false);
    }
  }, [buscaAplicada, etapa, municipio, pagina, router]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function buscar(e: FormEvent) {
    e.preventDefault();
    setPagina(1);
    setBuscaAplicada(busca.trim());
  }

  const totalPaginas = dados?.paginas ?? 1;

  return (
    <div>
      <div className="ficha-topo">
        <h1 className="sem-margem">Moradores</h1>
        <div className="acoes-linha">
          <Link className="botao botao-contorno" href="/admin/moradores/importar">
            Importar CSV
          </Link>
          <a className="botao botao-verde" href="/api/admin/export">
            Exportar CSV
          </a>
        </div>
      </div>

      <form className="cartao" onSubmit={buscar}>
        <div className="filtros">
          <div className="campo">
            <label htmlFor="busca">Buscar por nome, CPF ou protocolo</label>
            <input
              id="busca"
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex.: Maria, 123.456.789-09 ou ADH-2026-00001"
            />
          </div>
          <div className="campo">
            <label htmlFor="filtro-etapa">Etapa</label>
            <select
              id="filtro-etapa"
              value={etapa}
              onChange={(e) => {
                setEtapa(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todas</option>
              {ETAPAS.map((opcao) => (
                <option key={opcao.numero} value={opcao.numero}>
                  {opcao.numero}. {opcao.titulo}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="filtro-municipio">Município</label>
            <select
              id="filtro-municipio"
              value={municipio}
              onChange={(e) => {
                setMunicipio(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todos</option>
              {(dados?.municipios || []).map((cidade) => (
                <option key={cidade} value={cidade}>
                  {cidade}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="botao botao-contorno">
            Buscar
          </button>
        </div>
      </form>

      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}

      <section className="cartao" aria-label="Lista de moradores">
        {carregando ? (
          <p role="status" className="sem-margem">
            Carregando…
          </p>
        ) : !dados || dados.moradores.length === 0 ? (
          <p className="texto-suave sem-margem">Nenhum morador encontrado com esses filtros.</p>
        ) : (
          <>
            <p className="texto-suave">
              {dados.total} morador(es) encontrado(s).
            </p>
            <div className="tabela-caixa">
              <table className="tabela">
                <thead>
                  <tr>
                    <th scope="col">Protocolo</th>
                    <th scope="col">Nome</th>
                    <th scope="col">CPF</th>
                    <th scope="col">Município</th>
                    <th scope="col">Etapa</th>
                    <th scope="col">Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.moradores.map((morador) => (
                    <tr
                      key={morador.id}
                      className="tr-link"
                      onClick={() => router.push(`/admin/moradores/${morador.id}`)}
                    >
                      <td>
                        <Link href={`/admin/moradores/${morador.id}`}>{morador.protocol}</Link>
                      </td>
                      <td>{morador.full_name}</td>
                      <td>{formatarCpf(morador.cpf)}</td>
                      <td>{morador.city}</td>
                      <td>
                        <span
                          className={`pilula ${morador.stage === 7 ? 'pilula-etapa-final' : 'pilula-etapa'}`}
                        >
                          {morador.stage}. {etapaInfo(morador.stage).titulo}
                        </span>
                      </td>
                      <td>{formatarData(morador.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="paginacao">
              <button
                type="button"
                className="botao botao-suave botao-mini"
                onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                disabled={pagina <= 1}
              >
                ← Anterior
              </button>
              <span>
                Página {dados.pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                className="botao botao-suave botao-mini"
                onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))}
                disabled={pagina >= totalPaginas}
              >
                Próxima →
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
