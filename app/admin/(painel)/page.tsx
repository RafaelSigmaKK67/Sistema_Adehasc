'use client';

// Dashboard do painel administrativo.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ETAPAS } from '@/lib/etapas';
import { formatarCpf, formatarData } from '@/lib/formatar';

type MoradorResumo = {
  id: number;
  protocol: string;
  full_name: string;
  cpf: string;
  city: string;
  stage: number;
  created_at: string;
};

type Stats = {
  total: number;
  emAndamento: number;
  concluidos: number;
  novos30: number;
  porEtapa: number[];
  ultimos: MoradorResumo[];
  avisos: { demonstracao: boolean; segredoAusente: boolean; senhaPadraoPendente: boolean };
};

export default function PaginaDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    fetch('/api/admin/stats', { cache: 'no-store' })
      .then(async (resposta) => {
        if (resposta.status === 401) {
          router.replace('/admin/entrar');
          return;
        }
        if (!resposta.ok) throw new Error();
        setStats(await resposta.json());
      })
      .catch(() => setErro('Não conseguimos carregar as estatísticas. Recarregue a página.'));
  }, [router]);

  if (erro) {
    return (
      <div className="aviso aviso-erro" role="alert">
        {erro}
      </div>
    );
  }
  if (!stats) return <p role="status">Carregando o dashboard…</p>;

  const maiorEtapa = Math.max(...stats.porEtapa, 1);

  return (
    <div>
      <h1>Dashboard</h1>

      {stats.avisos.demonstracao && (
        <div className="aviso">
          <strong>Modo demonstração ativo</strong> — os cadastros ainda não estão sendo salvos
          em banco de dados. Para ativar o banco:
          <ol>
            <li>Abra o painel do projeto na Vercel e vá na aba <strong>Storage</strong>.</li>
            <li>Clique em <strong>Create Database</strong> → <strong>Neon (Postgres)</strong> e conecte ao projeto (isso cria a variável <code>DATABASE_URL</code> sozinho).</li>
            <li>Clique em <strong>Redeploy</strong> no último deploy. Pronto!</li>
          </ol>
        </div>
      )}
      {stats.avisos.senhaPadraoPendente && (
        <div className="aviso aviso-erro">
          <strong>Atenção:</strong> a senha padrão do administrador ainda não foi trocada. Vá em{' '}
          <Link href="/admin/configuracoes">Configurações</Link> e crie uma senha nova agora.
        </div>
      )}
      {stats.avisos.segredoAusente && (
        <div className="aviso">
          <strong>Configuração pendente:</strong> a variável <code>AUTH_SECRET</code> não está
          definida no ambiente. Defina um valor aleatório longo nas variáveis do projeto na
          Vercel para proteger as sessões.
        </div>
      )}

      <div className="grade-indicadores">
        <div className="indicador">
          <div className="indicador-numero">{stats.total}</div>
          <div className="indicador-rotulo">Total de moradores</div>
        </div>
        <div className="indicador indicador-azul">
          <div className="indicador-numero">{stats.emAndamento}</div>
          <div className="indicador-rotulo">Em andamento</div>
        </div>
        <div className="indicador indicador-verde">
          <div className="indicador-numero">{stats.concluidos}</div>
          <div className="indicador-rotulo">Concluídos (título entregue)</div>
        </div>
        <div className="indicador indicador-vermelho">
          <div className="indicador-numero">{stats.novos30}</div>
          <div className="indicador-rotulo">Novos (últimos 30 dias)</div>
        </div>
      </div>

      <section className="cartao" aria-labelledby="titulo-grafico">
        <h2 id="titulo-grafico">Moradores por etapa</h2>
        <div className="grafico-barras">
          {ETAPAS.map((etapa) => {
            const quantidade = stats.porEtapa[etapa.numero - 1] || 0;
            const largura = Math.round((quantidade / maiorEtapa) * 100);
            return (
              <div className="grafico-linha" key={etapa.numero}>
                <span className="grafico-rotulo">
                  {etapa.numero}. {etapa.titulo}
                </span>
                <div
                  className="grafico-trilha"
                  role="img"
                  aria-label={`${etapa.titulo}: ${quantidade} morador(es)`}
                >
                  <div
                    className={`grafico-preenchido ${etapa.numero === 7 ? 'grafico-preenchido-verde' : ''}`}
                    style={{ width: `${quantidade === 0 ? 0 : Math.max(largura, 4)}%` }}
                  />
                </div>
                <span className="grafico-valor">{quantidade}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="cartao" aria-labelledby="titulo-ultimos">
        <h2 id="titulo-ultimos">Últimos cadastros</h2>
        {stats.ultimos.length === 0 ? (
          <p className="texto-suave sem-margem">Nenhum cadastro por enquanto.</p>
        ) : (
          <div className="tabela-caixa">
            <table className="tabela">
              <thead>
                <tr>
                  <th scope="col">Protocolo</th>
                  <th scope="col">Nome</th>
                  <th scope="col">CPF</th>
                  <th scope="col">Município</th>
                  <th scope="col">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {stats.ultimos.map((morador) => (
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
                    <td>{formatarData(morador.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
