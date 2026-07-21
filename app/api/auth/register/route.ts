import bcrypt from 'bcryptjs';
import { cpfValido, limparCpf } from '@/lib/cpf';
import { dataValida, normalizarTelefone } from '@/lib/formatar';
import { ipDe, jsonErro, jsonOk, lerJson, limiteExcedido, origemValida } from '@/lib/http';
import { gravarSessao } from '@/lib/sessao';
import { eErroDuplicado, obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

type Corpo = {
  nome?: string;
  cpf?: string;
  nascimento?: string | null;
  telefone?: string;
  email?: string | null;
  estado_civil?: string | null;
  municipio?: string;
  bairro?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  anos_moradia?: number | null;
  tipo_imovel?: string | null;
  senha?: string;
  consentimento?: boolean;
};

function texto(valor: unknown, maximo = 200): string {
  return typeof valor === 'string' ? valor.trim().slice(0, maximo) : '';
}

function textoOuNulo(valor: unknown, maximo = 200): string | null {
  const limpo = texto(valor, maximo);
  return limpo || null;
}

export async function POST(req: Request) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);
  if (limiteExcedido(`registro:${ipDe(req)}`, 15, 60 * 60 * 1000)) {
    return jsonErro('Muitos cadastros seguidos. Aguarde um pouco e tente de novo.', 429);
  }

  const corpo = await lerJson<Corpo>(req);
  if (!corpo) return jsonErro('Não conseguimos ler os dados enviados. Tente de novo.');

  const nome = texto(corpo.nome);
  const cpf = limparCpf(texto(corpo.cpf, 20));
  const telefone = normalizarTelefone(texto(corpo.telefone, 25));
  const municipio = texto(corpo.municipio, 120);
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
  const nascimento = textoOuNulo(corpo.nascimento, 10);
  const email = textoOuNulo(corpo.email, 200);

  if (nome.length < 5) {
    return jsonErro('Escreva o seu nome completo, como está no documento.');
  }
  if (!cpfValido(cpf)) {
    return jsonErro('O CPF informado não é válido. Confira os números.');
  }
  if (telefone.length < 10 || telefone.length > 11) {
    return jsonErro('Escreva o telefone com DDD. Por exemplo: (49) 98503-1080.');
  }
  if (municipio.length < 2) {
    return jsonErro('Escreva o nome da cidade onde fica o imóvel.');
  }
  if (nascimento && !dataValida(nascimento)) {
    return jsonErro('A data de nascimento precisa estar no formato dd/mm/aaaa.');
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonErro('Este e-mail não parece completo. Confira se tem @ e o final (.com, .br…).');
  }
  if (senha.length < 6) {
    return jsonErro('A senha precisa ter pelo menos 6 letras ou números.');
  }
  if (corpo.consentimento !== true) {
    return jsonErro('Para continuar, marque a caixinha de autorização (LGPD).');
  }
  let anosMoradia: number | null = null;
  if (corpo.anos_moradia !== null && corpo.anos_moradia !== undefined) {
    const anos = Number(corpo.anos_moradia);
    if (!Number.isInteger(anos) || anos < 0 || anos > 120) {
      return jsonErro('Os anos de moradia precisam ser um número. Por exemplo: 15.');
    }
    anosMoradia = anos;
  }

  try {
    const dados = await obterDados();
    const existente = await dados.moradorPorCpf(cpf);
    if (existente) {
      return jsonErro('Este CPF já possui cadastro. Use a página Entrar.', 409);
    }

    const morador = await dados.criarMorador({
      full_name: nome,
      cpf,
      birth_date: nascimento,
      phone: telefone,
      email,
      marital_status: textoOuNulo(corpo.estado_civil, 40),
      city: municipio,
      neighborhood: textoOuNulo(corpo.bairro, 120),
      street: textoOuNulo(corpo.rua, 160),
      number: textoOuNulo(corpo.numero, 20),
      complement: textoOuNulo(corpo.complemento, 120),
      years_living: anosMoradia,
      property_type: textoOuNulo(corpo.tipo_imovel, 40),
      password_hash: await bcrypt.hash(senha, 10),
    });

    gravarSessao('morador', morador.id);
    return jsonOk({ protocolo: morador.protocol }, 201);
  } catch (erro) {
    if (eErroDuplicado(erro)) {
      return jsonErro('Este CPF já possui cadastro. Use a página Entrar.', 409);
    }
    return jsonErro('Não conseguimos salvar o seu cadastro agora. Tente de novo em instantes.', 500);
  }
}
