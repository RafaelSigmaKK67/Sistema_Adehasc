'use client';

// Importação de moradores por CSV: baixa a planilha modelo, confere o arquivo
// linha a linha antes de importar e devolve um CSV com as senhas temporárias.

import Link from 'next/link';
import { useState } from 'react';
import { analisarCsvComNumero, mapearCabecalho, CampoImportacao } from '@/lib/csv';
import { cpfValido, limparCpf } from '@/lib/cpf';
import { formatarCpf } from '@/lib/formatar';

const LOTE = 20;

type Linha = Record<CampoImportacao, string> & { numeroLinha: number };
type Conferencia = { validas: Linha[]; problemas: { numeroLinha: number; nome: string; erro: string }[] };
type Resultado = {
  cpf: string;
  nome: string;
  ok: boolean;
  protocolo?: string;
  senha_temporaria?: string;
  erro?: string;
};

function conferirArquivo(textoCsv: string): Conferencia | { erro: string } {
  const linhas = analisarCsvComNumero(textoCsv);
  if (linhas.length < 2) {
    return { erro: 'O arquivo precisa ter o cabeçalho e pelo menos um morador.' };
  }
  const mapa = mapearCabecalho(linhas[0].colunas);
  if (mapa.nome === undefined || mapa.cpf === undefined || mapa.telefone === undefined || mapa.municipio === undefined) {
    return {
      erro:
        'Não encontrei as colunas obrigatórias no cabeçalho: Nome completo, CPF, Telefone e Município. ' +
        'Baixe a planilha modelo para ver o formato certo.',
    };
  }

  const validas: Linha[] = [];
  const problemas: Conferencia['problemas'] = [];
  const cpfsNoArquivo = new Set<string>();

  linhas.slice(1).forEach(({ numero: numeroLinha, colunas }) => {
    const valor = (campo: CampoImportacao) =>
      mapa[campo] === undefined ? '' : (colunas[mapa[campo]!] || '').trim();
    const nome = valor('nome');
    const cpf = limparCpf(valor('cpf'));

    if (nome.length < 5) {
      problemas.push({ numeroLinha, nome: nome || '(sem nome)', erro: 'Nome incompleto.' });
      return;
    }
    if (!cpfValido(cpf)) {
      problemas.push({ numeroLinha, nome, erro: 'CPF inválido.' });
      return;
    }
    if (cpfsNoArquivo.has(cpf)) {
      problemas.push({ numeroLinha, nome, erro: 'CPF repetido dentro do arquivo.' });
      return;
    }
    cpfsNoArquivo.add(cpf);

    validas.push({
      numeroLinha,
      nome,
      cpf,
      telefone: valor('telefone'),
      nascimento: valor('nascimento'),
      email: valor('email'),
      estado_civil: valor('estado_civil'),
      municipio: valor('municipio'),
      bairro: valor('bairro'),
      rua: valor('rua'),
      numero: valor('numero'),
      complemento: valor('complemento'),
      anos_moradia: valor('anos_moradia'),
      tipo_imovel: valor('tipo_imovel'),
      etapa: valor('etapa'),
    });
  });

  return { validas, problemas };
}

export default function PaginaImportar() {
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [conferencia, setConferencia] = useState<Conferencia | null>(null);
  const [erro, setErro] = useState('');
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultados, setResultados] = useState<Resultado[] | null>(null);

  function aoEscolherArquivo(arquivo: File | undefined) {
    setConferencia(null);
    setResultados(null);
    setErro('');
    if (!arquivo) return;
    setNomeArquivo(arquivo.name);
    const leitor = new FileReader();
    leitor.onload = () => {
      const analise = conferirArquivo(String(leitor.result || ''));
      if ('erro' in analise) {
        setErro(analise.erro);
        return;
      }
      if (analise.validas.length === 0) {
        setErro('Nenhuma linha válida para importar. Confira os problemas apontados abaixo.');
      }
      setConferencia(analise);
    };
    leitor.readAsText(arquivo, 'utf-8');
  }

  async function importar() {
    if (!conferencia || conferencia.validas.length === 0) return;
    setImportando(true);
    setErro('');
    setProgresso(0);
    const acumulados: Resultado[] = [];
    try {
      for (let inicio = 0; inicio < conferencia.validas.length; inicio += LOTE) {
        const lote = conferencia.validas.slice(inicio, inicio + LOTE);
        const resposta = await fetch('/api/admin/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moradores: lote }),
        });
        const dados = await resposta.json().catch(() => null);
        if (!resposta.ok) {
          throw new Error((dados && dados.erro) || 'Falha no envio de um dos lotes.');
        }
        acumulados.push(...dados.resultados);
        setProgresso(Math.min(inicio + LOTE, conferencia.validas.length));
      }
      setResultados(acumulados);
      setConferencia(null);
    } catch (excecao) {
      setErro(
        (excecao instanceof Error && excecao.message) ||
          'Não conseguimos concluir a importação. Os moradores já importados foram salvos.'
      );
      if (acumulados.length > 0) setResultados(acumulados);
    } finally {
      setImportando(false);
    }
  }

  function baixarSenhas() {
    if (!resultados) return;
    // Mesma proteção da exportação do servidor: um nome começando com = + - @
    // não pode virar fórmula quando o arquivo abre no Excel.
    const campoCsv = (valor: string) => {
      let texto = valor ?? '';
      if (/^[=+\-@\t]/.test(texto)) texto = `'${texto}`;
      return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
    };
    const linhas = [
      'Nome;CPF;Protocolo;Senha temporária;Resultado',
      ...resultados.map((r) =>
        [
          r.nome,
          formatarCpf(r.cpf),
          r.protocolo || '',
          r.senha_temporaria || '',
          r.ok ? 'Importado' : `Erro: ${r.erro}`,
        ]
          .map(campoCsv)
          .join(';')
      ),
    ];
    const blob = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'moradores-importados-senhas.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const importados = resultados?.filter((r) => r.ok) ?? [];
  const falharam = resultados?.filter((r) => !r.ok) ?? [];

  return (
    <div>
      <div className="ficha-topo">
        <h1 className="sem-margem">Importar moradores (CSV)</h1>
        <Link className="botao botao-suave botao-mini" href="/admin/moradores">
          ← Voltar para a lista
        </Link>
      </div>

      <section className="cartao" aria-labelledby="titulo-como-importar">
        <h2 id="titulo-como-importar">Como funciona</h2>
        <ol style={{ margin: 0, paddingLeft: 22 }}>
          <li>
            Baixe a <a href="/api/admin/import">planilha modelo</a> e preencha no Excel — uma
            linha por morador (Nome, CPF, Telefone e Município são obrigatórios; a coluna
            Etapa aceita de 1 a 7).
          </li>
          <li>Escolha o arquivo aqui embaixo. Nós conferimos tudo antes de importar.</li>
          <li>
            Cada morador entra com uma <strong>senha temporária</strong> (troca obrigatória no
            primeiro acesso). No final, baixe o CSV com as senhas para repassar a cada um.
          </li>
        </ol>
      </section>

      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}

      {!resultados && (
        <section className="cartao" aria-labelledby="titulo-arquivo">
          <h2 id="titulo-arquivo">Arquivo</h2>
          <div className="campo">
            <label htmlFor="arquivo-csv">Planilha preenchida (.csv)</label>
            <input
              id="arquivo-csv"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => aoEscolherArquivo(e.target.files?.[0])}
              disabled={importando}
            />
          </div>

          {conferencia && (
            <>
              <div className={`aviso ${conferencia.problemas.length ? '' : 'aviso-ok'}`}>
                <strong>{nomeArquivo}</strong>: {conferencia.validas.length} morador(es)
                prontos para importar
                {conferencia.problemas.length > 0 &&
                  ` · ${conferencia.problemas.length} linha(s) com problema (ficam de fora)`}
                .
              </div>

              {conferencia.problemas.length > 0 && (
                <div className="tabela-caixa mb-2">
                  <table className="tabela">
                    <thead>
                      <tr>
                        <th scope="col">Linha</th>
                        <th scope="col">Nome</th>
                        <th scope="col">Problema</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conferencia.problemas.map((problema) => (
                        <tr key={problema.numeroLinha}>
                          <td>{problema.numeroLinha}</td>
                          <td>{problema.nome}</td>
                          <td>{problema.erro}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {conferencia.validas.length > 0 && (
                <button
                  type="button"
                  className="botao botao-primario"
                  onClick={importar}
                  disabled={importando}
                >
                  {importando
                    ? `Importando… ${progresso} de ${conferencia.validas.length}`
                    : `Importar ${conferencia.validas.length} morador(es)`}
                </button>
              )}
            </>
          )}
        </section>
      )}

      {resultados && (
        <section className="cartao" aria-labelledby="titulo-resultado">
          <h2 id="titulo-resultado">Resultado da importação</h2>
          <div className={`aviso ${falharam.length ? '' : 'aviso-ok'}`} role="status">
            <strong>{importados.length} morador(es) importados</strong>
            {falharam.length > 0 && ` · ${falharam.length} não entraram (veja abaixo)`}.
          </div>
          {importados.length > 0 && (
            <>
              <p className="texto-suave">
                Baixe as senhas temporárias e guarde com cuidado — cada morador troca a senha
                no primeiro acesso.
              </p>
              <button type="button" className="botao botao-verde" onClick={baixarSenhas}>
                Baixar CSV com as senhas temporárias
              </button>
            </>
          )}
          {falharam.length > 0 && (
            <div className="tabela-caixa mt-2">
              <table className="tabela">
                <thead>
                  <tr>
                    <th scope="col">Nome</th>
                    <th scope="col">CPF</th>
                    <th scope="col">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {falharam.map((r, indice) => (
                    <tr key={`${r.cpf}-${indice}`}>
                      <td>{r.nome}</td>
                      <td>{formatarCpf(r.cpf)}</td>
                      <td>{r.erro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="acoes-linha mt-2">
            <Link className="botao botao-contorno botao-mini" href="/admin/moradores">
              Ver a lista de moradores
            </Link>
            <button
              type="button"
              className="botao botao-suave botao-mini"
              onClick={() => {
                setResultados(null);
                setNomeArquivo('');
              }}
            >
              Importar outro arquivo
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
