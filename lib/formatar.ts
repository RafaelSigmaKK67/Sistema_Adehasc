// Máscaras e formatação — funções puras, seguras para cliente e servidor.

export function mascaraCpf(valor: string): string {
  const d = (valor || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatarCpf(digitos: string): string {
  return mascaraCpf(digitos);
}

/**
 * Só os dígitos do telefone, removendo o código do país (+55) quando alguém
 * cola um número no formato internacional. DDDs 55 (região de Santa Maria/RS)
 * continuam funcionando: só removemos o 55 quando sobram 12–13 dígitos.
 */
export function normalizarTelefone(valor: string): string {
  let d = (valor || '').replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  return d.slice(0, 11);
}

export function mascaraTelefone(valor: string): string {
  const d = normalizarTelefone(valor);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function limparTelefone(valor: string): string {
  return normalizarTelefone(valor);
}

export function mascaraData(valor: string): string {
  const d = (valor || '').replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Confere uma data no formato dd/mm/aaaa (dia, mês e ano reais). */
export function dataValida(valor: string): boolean {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((valor || '').trim());
  if (!m) return false;
  const dia = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);
  const ano = parseInt(m[3], 10);
  if (ano < 1900 || ano > new Date().getFullYear()) return false;
  if (mes < 1 || mes > 12) return false;
  const diasNoMes = new Date(ano, mes, 0).getDate();
  if (dia < 1 || dia > diasNoMes) return false;
  // Data de nascimento não pode estar no futuro.
  return new Date(ano, mes - 1, dia).getTime() <= Date.now();
}

const FUSO_BRASILIA = 'America/Sao_Paulo';

export function formatarDataHora(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: FUSO_BRASILIA,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatarData(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: FUSO_BRASILIA,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function primeiroNome(nomeCompleto: string): string {
  return (nomeCompleto || '').trim().split(/\s+/)[0] || '';
}
