// Validação de CPF com dígitos verificadores — usada no cliente E no servidor.

export function limparCpf(valor: string): string {
  return (valor || '').replace(/\D/g, '');
}

export function cpfValido(valor: string): boolean {
  const cpf = limparCpf(valor);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos os dígitos iguais
  for (const tamanho of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) {
      soma += parseInt(cpf[i], 10) * (tamanho + 1 - i);
    }
    const resto = soma % 11;
    const digito = resto < 2 ? 0 : 11 - resto;
    if (digito !== parseInt(cpf[tamanho], 10)) return false;
  }
  return true;
}
