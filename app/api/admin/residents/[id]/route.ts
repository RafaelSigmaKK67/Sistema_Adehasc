// Ficha do morador: leitura completa, edição de qualquer campo cadastral e exclusão.

import { cpfValido, limparCpf } from '@/lib/cpf';
import { dataValida, normalizarTelefone } from '@/lib/formatar';
import { exigirAdmin, jsonErro, jsonOk, lerJson, origemValida } from '@/lib/http';
import { CamposMorador, eErroDuplicado, moradorPublico, obterDados } from '@/lib/store';

export const dynamic = 'force-dynamic';

function idValido(bruto: string): number | null {
  const id = Number(bruto);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;
  const id = idValido(params.id);
  if (!id) return jsonErro('Cadastro não encontrado.', 404);

  try {
    const dados = await obterDados();
    const morador = await dados.moradorPorId(id);
    if (!morador) return jsonErro('Cadastro não encontrado.', 404);
    const [atualizacoes, documentos, notas] = await Promise.all([
      dados.listarAtualizacoes(id),
      dados.listarDocumentos(id),
      dados.listarNotas(id),
    ]);
    return jsonOk({
      morador: moradorPublico(morador),
      atualizacoes,
      documentos: documentos.map(({ id: docId, name, status }) => ({ id: docId, name, status })),
      notas,
    });
  } catch {
    return jsonErro('Não conseguimos carregar a ficha agora.', 500);
  }
}

type CorpoEdicao = {
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
};

function textoOuNulo(valor: unknown, maximo = 200): string | null {
  if (typeof valor !== 'string') return null;
  const limpo = valor.trim().slice(0, maximo);
  return limpo || null;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;
  const id = idValido(params.id);
  if (!id) return jsonErro('Cadastro não encontrado.', 404);

  const corpo = await lerJson<CorpoEdicao>(req);
  if (!corpo) return jsonErro('Não conseguimos ler os dados enviados.');

  const campos: CamposMorador = {};

  if (corpo.nome !== undefined) {
    const nome = (corpo.nome || '').trim().slice(0, 200);
    if (nome.length < 5) return jsonErro('Escreva o nome completo do morador.');
    campos.full_name = nome;
  }
  if (corpo.telefone !== undefined) {
    const telefone = normalizarTelefone(corpo.telefone || '');
    if (telefone.length < 10 || telefone.length > 11) {
      return jsonErro('Escreva o telefone com DDD.');
    }
    campos.phone = telefone;
  }
  if (corpo.municipio !== undefined) {
    const municipio = (corpo.municipio || '').trim().slice(0, 120);
    if (municipio.length < 2) return jsonErro('Escreva o município.');
    campos.city = municipio;
  }
  if (corpo.nascimento !== undefined) {
    const nascimento = textoOuNulo(corpo.nascimento, 10);
    if (nascimento && !dataValida(nascimento)) {
      return jsonErro('A data de nascimento precisa estar no formato dd/mm/aaaa.');
    }
    campos.birth_date = nascimento;
  }
  if (corpo.email !== undefined) {
    const email = textoOuNulo(corpo.email, 200);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonErro('Este e-mail não parece válido.');
    }
    campos.email = email;
  }
  if (corpo.estado_civil !== undefined) campos.marital_status = textoOuNulo(corpo.estado_civil, 40);
  if (corpo.bairro !== undefined) campos.neighborhood = textoOuNulo(corpo.bairro, 120);
  if (corpo.rua !== undefined) campos.street = textoOuNulo(corpo.rua, 160);
  if (corpo.numero !== undefined) campos.number = textoOuNulo(corpo.numero, 20);
  if (corpo.complemento !== undefined) campos.complement = textoOuNulo(corpo.complemento, 120);
  if (corpo.tipo_imovel !== undefined) campos.property_type = textoOuNulo(corpo.tipo_imovel, 40);
  if (corpo.anos_moradia !== undefined) {
    if (corpo.anos_moradia === null) {
      campos.years_living = null;
    } else {
      const anos = Number(corpo.anos_moradia);
      if (!Number.isInteger(anos) || anos < 0 || anos > 120) {
        return jsonErro('Os anos de moradia precisam ser um número.');
      }
      campos.years_living = anos;
    }
  }

  try {
    const dados = await obterDados();
    if (corpo.cpf !== undefined) {
      const cpf = limparCpf(corpo.cpf || '');
      if (!cpfValido(cpf)) return jsonErro('O CPF informado não é válido. Confira os números.');
      const existente = await dados.moradorPorCpf(cpf);
      if (existente && existente.id !== id) {
        return jsonErro('Este CPF já pertence a outro cadastro.', 409);
      }
      campos.cpf = cpf;
    }

    const morador = await dados.atualizarMorador(id, campos);
    if (!morador) return jsonErro('Cadastro não encontrado.', 404);
    return jsonOk({ morador: moradorPublico(morador) });
  } catch (erro) {
    if (eErroDuplicado(erro)) {
      return jsonErro('Este CPF já pertence a outro cadastro.', 409);
    }
    return jsonErro('Não conseguimos salvar agora. Tente de novo em instantes.', 500);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!origemValida(req)) return jsonErro('Origem inválida.', 403);
  const acesso = exigirAdmin();
  if ('resposta' in acesso) return acesso.resposta;
  const id = idValido(params.id);
  if (!id) return jsonErro('Cadastro não encontrado.', 404);

  try {
    const dados = await obterDados();
    const excluiu = await dados.excluirMorador(id);
    if (!excluiu) return jsonErro('Cadastro não encontrado.', 404);
    return jsonOk({ ok: true });
  } catch {
    return jsonErro('Não conseguimos excluir agora. Tente de novo em instantes.', 500);
  }
}
