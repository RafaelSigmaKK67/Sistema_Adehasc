'use client';

// Cadastro do morador — assistente em 5 passos, uma pergunta/assunto por tela.

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FormEvent, useRef, useState } from 'react';
import Logo from '@/components/Logo';
import CampoSenha from '@/components/CampoSenha';
import { cpfValido, limparCpf } from '@/lib/cpf';
import {
  dataValida,
  limparTelefone,
  mascaraCpf,
  mascaraData,
  mascaraTelefone,
} from '@/lib/formatar';
import { DOCUMENTOS_PADRAO } from '@/lib/etapas';

const TOTAL_PASSOS = 5;

const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)'];
const TIPOS_IMOVEL = ['Casa', 'Terreno', 'Outro'];

const TITULOS_PASSOS = [
  'Seus dados',
  'Endereço do imóvel',
  'Sobre o imóvel',
  'Criar senha',
  'Revisão',
];

type Formulario = {
  nome: string;
  cpf: string;
  nascimento: string;
  telefone: string;
  email: string;
  estado_civil: string;
  municipio: string;
  bairro: string;
  rua: string;
  numero: string;
  complemento: string;
  anos_moradia: string;
  tipo_imovel: string;
  docs_possui: string[];
  senha: string;
  confirmar: string;
  consentimento: boolean;
};

const FORMULARIO_VAZIO: Formulario = {
  nome: '',
  cpf: '',
  nascimento: '',
  telefone: '',
  email: '',
  estado_civil: '',
  municipio: '',
  bairro: '',
  rua: '',
  numero: '',
  complemento: '',
  anos_moradia: '',
  tipo_imovel: 'Casa',
  docs_possui: [],
  senha: '',
  confirmar: '',
  consentimento: false,
};

type Erros = Partial<Record<keyof Formulario, string>>;

function validarPasso1(f: Formulario): Erros {
  const erros: Erros = {};
  if (f.nome.trim().length < 5) {
    erros.nome = 'Escreva o seu nome completo, como está no documento.';
  }
  if (!cpfValido(f.cpf)) {
    erros.cpf = 'O CPF informado não é válido. Confira os números.';
  }
  if (f.nascimento.trim() && !dataValida(f.nascimento)) {
    erros.nascimento = 'Escreva a data assim: dia/mês/ano. Por exemplo: 05/03/1958.';
  }
  if (limparTelefone(f.telefone).length < 10) {
    erros.telefone = 'Escreva o telefone com DDD. Por exemplo: (49) 98503-1080.';
  }
  if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
    erros.email = 'Este e-mail não parece completo. Confira se tem @ e o final (.com, .br…).';
  }
  return erros;
}

function validarPasso2(f: Formulario): Erros {
  const erros: Erros = {};
  if (f.municipio.trim().length < 2) {
    erros.municipio = 'Escreva o nome da cidade onde fica o imóvel.';
  }
  if (f.anos_moradia.trim()) {
    const anos = Number(f.anos_moradia);
    if (!Number.isInteger(anos) || anos < 0 || anos > 120) {
      erros.anos_moradia = 'Escreva só o número de anos. Por exemplo: 15.';
    }
  }
  return erros;
}

function validarPasso4(f: Formulario): Erros {
  const erros: Erros = {};
  if (f.senha.length < 6) {
    erros.senha = 'A senha precisa ter pelo menos 6 letras ou números.';
  }
  if (f.confirmar !== f.senha || f.confirmar.length === 0) {
    erros.confirmar = 'As duas senhas precisam ser iguais. Escreva de novo, com calma.';
  }
  if (!f.consentimento) {
    erros.consentimento = 'Para continuar, marque a caixinha de autorização.';
  }
  return erros;
}

export default function PaginaCadastro() {
  const router = useRouter();
  const [passo, setPasso] = useState(1);
  const [form, setForm] = useState<Formulario>(FORMULARIO_VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [erroEnvio, setErroEnvio] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [protocolo, setProtocolo] = useState('');
  const topoRef = useRef<HTMLDivElement>(null);

  function mudar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atuais) => {
      if (!atuais[campo]) return atuais;
      const { [campo]: _removido, ...resto } = atuais;
      return resto;
    });
  }

  function irPara(novoPasso: number) {
    setPasso(novoPasso);
    setErroEnvio('');
    topoRef.current?.scrollIntoView({ block: 'start' });
    window.scrollTo({ top: 0 });
  }

  function validarPassoAtual(): boolean {
    let encontrados: Erros = {};
    if (passo === 1) encontrados = validarPasso1(form);
    if (passo === 2) encontrados = validarPasso2(form);
    if (passo === 4) encontrados = validarPasso4(form);
    setErros(encontrados);
    const primeiroErro = Object.keys(encontrados)[0];
    if (primeiroErro) {
      // Leva o foco ao primeiro campo com problema, para o leitor de tela anunciar o erro.
      setTimeout(() => document.getElementById(primeiroErro)?.focus(), 0);
      return false;
    }
    return true;
  }

  function avancar(e: FormEvent) {
    e.preventDefault();
    if (!validarPassoAtual()) return;
    if (passo < TOTAL_PASSOS) irPara(passo + 1);
  }

  async function confirmarCadastro() {
    setEnviando(true);
    setErroEnvio('');
    try {
      const resposta = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          cpf: limparCpf(form.cpf),
          nascimento: form.nascimento.trim() || null,
          telefone: limparTelefone(form.telefone),
          email: form.email.trim() || null,
          estado_civil: form.estado_civil || null,
          municipio: form.municipio.trim(),
          bairro: form.bairro.trim() || null,
          rua: form.rua.trim() || null,
          numero: form.numero.trim() || null,
          complemento: form.complemento.trim() || null,
          anos_moradia: form.anos_moradia.trim() ? Number(form.anos_moradia) : null,
          tipo_imovel: form.tipo_imovel,
          senha: form.senha,
          consentimento: form.consentimento,
        }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErroEnvio(
          (dados && dados.erro) || 'Não conseguimos salvar o seu cadastro. Tente de novo, por favor.'
        );
        return;
      }
      setProtocolo(dados.protocolo);
      window.scrollTo({ top: 0 });
    } catch {
      setErroEnvio('Não conseguimos falar com o servidor. Confira a sua internet e tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  function alternarDocumento(nomeDocumento: string) {
    const atuais = form.docs_possui;
    mudar(
      'docs_possui',
      atuais.includes(nomeDocumento)
        ? atuais.filter((d) => d !== nomeDocumento)
        : [...atuais, nomeDocumento]
    );
  }

  // ---- Tela de sucesso ----
  if (protocolo) {
    return (
      <main className="assistente">
        <div className="container-estreito">
          <div className="cartao tela-sucesso">
            <div className="sucesso-icone" aria-hidden="true">
              ✓
            </div>
            <h1>Cadastro feito com sucesso!</h1>
            <p>Este é o número do seu processo:</p>
            <p className="protocolo-destaque">{protocolo}</p>
            <p>
              <strong>Guarde este número com carinho.</strong> Ele identifica o seu processo
              sempre que você falar com a gente.
            </p>
            <button
              type="button"
              className="botao botao-primario botao-largo mt-2"
              onClick={() => router.push('/painel')}
            >
              Ir para o meu painel
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="assistente">
      <div className="container-estreito" ref={topoRef}>
        <p>
          <Link href="/" className="logo-volta">
            <Logo tamanho={36} />
          </Link>
        </p>
        <div className="passo-cabecalho">
          <span className="passo-rotulo" aria-live="polite">
            Passo {passo} de {TOTAL_PASSOS} — {TITULOS_PASSOS[passo - 1]}
          </span>
          <div
            className="passo-barra"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={TOTAL_PASSOS}
            aria-valuenow={passo}
            aria-valuetext={`Passo ${passo} de ${TOTAL_PASSOS}`}
            aria-label="Andamento do cadastro"
          >
            <div className="passo-barra-preenchida" style={{ width: `${(passo / TOTAL_PASSOS) * 100}%` }} />
          </div>
        </div>

        {erroEnvio && (
          <div className="aviso aviso-erro" role="alert">
            {erroEnvio}
          </div>
        )}

        <form className="cartao" onSubmit={avancar} noValidate>
          {passo === 1 && (
            <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend className="escondido-visual">Seus dados</legend>
              <h1>Vamos começar pelos seus dados</h1>
              <div className={`campo ${erros.nome ? 'campo-com-erro' : ''}`}>
                <label htmlFor="nome">Nome completo *</label>
                <input
                  id="nome"
                  type="text"
                  value={form.nome}
                  onChange={(e) => mudar('nome', e.target.value)}
                  autoComplete="name"
                  aria-invalid={!!erros.nome}
                  aria-describedby={erros.nome ? 'nome-erro' : undefined}
                />
                {erros.nome && (
                  <p className="msg-erro" id="nome-erro">
                    {erros.nome}
                  </p>
                )}
              </div>
              <div className={`campo ${erros.cpf ? 'campo-com-erro' : ''}`}>
                <label htmlFor="cpf">CPF *</label>
                <input
                  id="cpf"
                  type="text"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={(e) => mudar('cpf', mascaraCpf(e.target.value))}
                  aria-invalid={!!erros.cpf}
                  aria-describedby={erros.cpf ? 'cpf-erro' : undefined}
                />
                {erros.cpf && (
                  <p className="msg-erro" id="cpf-erro">
                    {erros.cpf}
                  </p>
                )}
              </div>
              <div className={`campo ${erros.nascimento ? 'campo-com-erro' : ''}`}>
                <label htmlFor="nascimento">Data de nascimento</label>
                <input
                  id="nascimento"
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  value={form.nascimento}
                  onChange={(e) => mudar('nascimento', mascaraData(e.target.value))}
                  aria-invalid={!!erros.nascimento}
                  aria-describedby={erros.nascimento ? 'nascimento-erro' : undefined}
                />
                {erros.nascimento && (
                  <p className="msg-erro" id="nascimento-erro">
                    {erros.nascimento}
                  </p>
                )}
              </div>
              <div className={`campo ${erros.telefone ? 'campo-com-erro' : ''}`}>
                <label htmlFor="telefone">Telefone ou WhatsApp *</label>
                <input
                  id="telefone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="(49) 90000-0000"
                  value={form.telefone}
                  onChange={(e) => mudar('telefone', mascaraTelefone(e.target.value))}
                  autoComplete="tel"
                  aria-invalid={!!erros.telefone}
                  aria-describedby={erros.telefone ? 'telefone-erro' : undefined}
                />
                {erros.telefone && (
                  <p className="msg-erro" id="telefone-erro">
                    {erros.telefone}
                  </p>
                )}
              </div>
              <div className={`campo ${erros.email ? 'campo-com-erro' : ''}`}>
                <label htmlFor="email">E-mail (se tiver)</label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => mudar('email', e.target.value)}
                  autoComplete="email"
                  aria-invalid={!!erros.email}
                  aria-describedby={erros.email ? 'email-erro' : undefined}
                />
                {erros.email && (
                  <p className="msg-erro" id="email-erro">
                    {erros.email}
                  </p>
                )}
              </div>
              <div className="campo">
                <label htmlFor="estado_civil">Estado civil</label>
                <select
                  id="estado_civil"
                  value={form.estado_civil}
                  onChange={(e) => mudar('estado_civil', e.target.value)}
                >
                  <option value="">Escolha uma opção</option>
                  {ESTADOS_CIVIS.map((opcao) => (
                    <option key={opcao} value={opcao}>
                      {opcao}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>
          )}

          {passo === 2 && (
            <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend className="escondido-visual">Endereço do imóvel</legend>
              <h1>Onde fica o imóvel?</h1>
              <div className={`campo ${erros.municipio ? 'campo-com-erro' : ''}`}>
                <label htmlFor="municipio">Município (cidade) *</label>
                <input
                  id="municipio"
                  type="text"
                  value={form.municipio}
                  onChange={(e) => mudar('municipio', e.target.value)}
                  aria-invalid={!!erros.municipio}
                  aria-describedby={erros.municipio ? 'municipio-erro' : undefined}
                />
                {erros.municipio && (
                  <p className="msg-erro" id="municipio-erro">
                    {erros.municipio}
                  </p>
                )}
              </div>
              <div className="campo">
                <label htmlFor="bairro">Bairro ou núcleo</label>
                <input
                  id="bairro"
                  type="text"
                  value={form.bairro}
                  onChange={(e) => mudar('bairro', e.target.value)}
                />
              </div>
              <div className="campo">
                <label htmlFor="rua">Rua</label>
                <input id="rua" type="text" value={form.rua} onChange={(e) => mudar('rua', e.target.value)} />
              </div>
              <div className="campo">
                <label htmlFor="numero">Número</label>
                <input
                  id="numero"
                  type="text"
                  value={form.numero}
                  onChange={(e) => mudar('numero', e.target.value)}
                />
              </div>
              <div className="campo">
                <label htmlFor="complemento">Complemento (se tiver)</label>
                <input
                  id="complemento"
                  type="text"
                  value={form.complemento}
                  onChange={(e) => mudar('complemento', e.target.value)}
                />
              </div>
              <div className={`campo ${erros.anos_moradia ? 'campo-com-erro' : ''}`}>
                <label htmlFor="anos_moradia">Há quantos anos você mora no imóvel?</label>
                <input
                  id="anos_moradia"
                  type="text"
                  inputMode="numeric"
                  value={form.anos_moradia}
                  onChange={(e) => mudar('anos_moradia', e.target.value.replace(/\D/g, '').slice(0, 3))}
                  aria-invalid={!!erros.anos_moradia}
                  aria-describedby={erros.anos_moradia ? 'anos_moradia-erro' : undefined}
                />
                {erros.anos_moradia && (
                  <p className="msg-erro" id="anos_moradia-erro">
                    {erros.anos_moradia}
                  </p>
                )}
              </div>
            </fieldset>
          )}

          {passo === 3 && (
            <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend className="escondido-visual">Sobre o imóvel</legend>
              <h1>Conte um pouco sobre o imóvel</h1>
              <div className="campo">
                <span
                  id="rotulo-tipo"
                  style={{ display: 'block', fontWeight: 700, color: 'var(--tinta)', marginBottom: 6 }}
                >
                  O imóvel é:
                </span>
                <div className="grupo-radio" role="radiogroup" aria-labelledby="rotulo-tipo">
                  {TIPOS_IMOVEL.map((tipo) => (
                    <label key={tipo}>
                      <input
                        type="radio"
                        name="tipo_imovel"
                        value={tipo}
                        checked={form.tipo_imovel === tipo}
                        onChange={() => mudar('tipo_imovel', tipo)}
                      />
                      {tipo}
                    </label>
                  ))}
                </div>
              </div>
              <div className="campo">
                <span
                  id="rotulo-docs"
                  style={{ display: 'block', fontWeight: 700, color: 'var(--tinta)', marginBottom: 6 }}
                >
                  Quais destes documentos você já tem em casa?
                </span>
                <p className="campo-dica">
                  Marque só para a gente saber. Se não tiver algum, não tem problema.
                </p>
                <div className="grupo-radio" role="group" aria-labelledby="rotulo-docs">
                  {DOCUMENTOS_PADRAO.map((documento) => (
                    <label key={documento}>
                      <input
                        type="checkbox"
                        checked={form.docs_possui.includes(documento)}
                        onChange={() => alternarDocumento(documento)}
                      />
                      {documento}
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>
          )}

          {passo === 4 && (
            <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend className="escondido-visual">Criar senha</legend>
              <h1>Crie uma senha para acompanhar o processo</h1>
              <p className="texto-suave">
                Com essa senha e o seu CPF, você entra no sistema quando quiser para ver o
                andamento do seu processo.
              </p>
              <CampoSenha
                id="senha"
                rotulo="Senha *"
                dica="Use pelo menos 6 letras ou números. Escolha algo fácil de lembrar."
                valor={form.senha}
                aoMudar={(v) => mudar('senha', v)}
                erro={erros.senha}
                autoComplete="new-password"
              />
              <CampoSenha
                id="confirmar"
                rotulo="Escreva a senha de novo *"
                valor={form.confirmar}
                aoMudar={(v) => mudar('confirmar', v)}
                erro={erros.confirmar}
                autoComplete="new-password"
              />
              <div className={`campo ${erros.consentimento ? 'campo-com-erro' : ''}`}>
                <label className="caixa-marcar" htmlFor="consentimento">
                  <input
                    id="consentimento"
                    type="checkbox"
                    checked={form.consentimento}
                    onChange={(e) => mudar('consentimento', e.target.checked)}
                    aria-invalid={!!erros.consentimento}
                  aria-describedby={erros.consentimento ? 'consentimento-erro' : undefined}
                  />
                  <span>
                    Autorizo a ADEHASC a usar os meus dados apenas para o processo de
                    regularização fundiária. <Link href="/privacidade" target="_blank">Saiba como cuidamos dos seus dados</Link>.
                  </span>
                </label>
                {erros.consentimento && (
                  <p className="msg-erro" id="consentimento-erro">
                    {erros.consentimento}
                  </p>
                )}
              </div>
            </fieldset>
          )}

          {passo === 5 && (
            <div>
              <h1>Confira se está tudo certo</h1>
              <p className="texto-suave">
                Estamos quase lá! Leia com calma e, se precisar mudar algo, use o botão
                “Corrigir”.
              </p>

              <section className="revisao-secao" aria-label="Seus dados">
                <div className="revisao-secao-topo">
                  <h3>Seus dados</h3>
                  <button type="button" className="botao botao-suave botao-mini" onClick={() => irPara(1)}>
                    Corrigir
                  </button>
                </div>
                <dl className="dados-lista sem-margem">
                  <div className="revisao-linha">
                    <dt>Nome</dt>
                    <dd>{form.nome}</dd>
                  </div>
                  <div className="revisao-linha">
                    <dt>CPF</dt>
                    <dd>{form.cpf}</dd>
                  </div>
                  <div className="revisao-linha">
                    <dt>Nascimento</dt>
                    <dd>{form.nascimento || '—'}</dd>
                  </div>
                  <div className="revisao-linha">
                    <dt>Telefone</dt>
                    <dd>{form.telefone}</dd>
                  </div>
                  <div className="revisao-linha">
                    <dt>E-mail</dt>
                    <dd>{form.email || '—'}</dd>
                  </div>
                  <div className="revisao-linha">
                    <dt>Estado civil</dt>
                    <dd>{form.estado_civil || '—'}</dd>
                  </div>
                </dl>
              </section>

              <section className="revisao-secao" aria-label="Endereço do imóvel">
                <div className="revisao-secao-topo">
                  <h3>Endereço do imóvel</h3>
                  <button type="button" className="botao botao-suave botao-mini" onClick={() => irPara(2)}>
                    Corrigir
                  </button>
                </div>
                <dl className="dados-lista sem-margem">
                  <div className="revisao-linha">
                    <dt>Município</dt>
                    <dd>{form.municipio}</dd>
                  </div>
                  <div className="revisao-linha">
                    <dt>Bairro</dt>
                    <dd>{form.bairro || '—'}</dd>
                  </div>
                  <div className="revisao-linha">
                    <dt>Rua</dt>
                    <dd>{form.rua || '—'}</dd>
                  </div>
                  <div className="revisao-linha">
                    <dt>Número</dt>
                    <dd>{form.numero || '—'}</dd>
                  </div>
                  <div className="revisao-linha">
                    <dt>Complemento</dt>
                    <dd>{form.complemento || '—'}</dd>
                  </div>
                  <div className="revisao-linha">
                    <dt>Anos no imóvel</dt>
                    <dd>{form.anos_moradia || '—'}</dd>
                  </div>
                </dl>
              </section>

              <section className="revisao-secao" aria-label="Sobre o imóvel">
                <div className="revisao-secao-topo">
                  <h3>Sobre o imóvel</h3>
                  <button type="button" className="botao botao-suave botao-mini" onClick={() => irPara(3)}>
                    Corrigir
                  </button>
                </div>
                <dl className="dados-lista sem-margem">
                  <div className="revisao-linha">
                    <dt>Tipo</dt>
                    <dd>{form.tipo_imovel}</dd>
                  </div>
                  <div className="revisao-linha">
                    <dt>Documentos que já tem</dt>
                    <dd>{form.docs_possui.length > 0 ? form.docs_possui.join(', ') : 'Nenhum por enquanto'}</dd>
                  </div>
                </dl>
              </section>

              <button
                type="button"
                className="botao botao-primario botao-largo mt-2"
                onClick={confirmarCadastro}
                disabled={enviando}
              >
                {enviando ? 'Enviando…' : 'Confirmar meu cadastro'}
              </button>
            </div>
          )}

          <div className="assistente-acoes">
            {passo === 1 ? (
              <Link className="botao botao-suave" href="/">
                ← Voltar
              </Link>
            ) : (
              <button type="button" className="botao botao-suave" onClick={() => irPara(passo - 1)}>
                ← Voltar
              </button>
            )}
            {passo < TOTAL_PASSOS && (
              <button type="submit" className="botao botao-primario">
                Continuar →
              </button>
            )}
          </div>
        </form>

        <p className="texto-centro texto-suave">
          Precisa de ajuda para se cadastrar? Ligue para a gente:{' '}
          <a href="tel:+554936223137">(49) 3622-3137</a>
        </p>
      </div>
    </main>
  );
}
