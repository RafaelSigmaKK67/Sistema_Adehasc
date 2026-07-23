// Senha temporária fácil de ditar por telefone (ex.: KM4729) — sem letras que
// confundem (I, O, Q…). Usada na redefinição pelo admin e na importação de CSV.

import crypto from 'crypto';

const LETRAS = 'ABCDEFGHJKLMNPRSTUVXZ';

export function gerarSenhaTemporaria(): string {
  const letra1 = LETRAS[crypto.randomInt(LETRAS.length)];
  const letra2 = LETRAS[crypto.randomInt(LETRAS.length)];
  const numeros = crypto.randomInt(1000, 10000);
  return `${letra1}${letra2}${numeros}`;
}
