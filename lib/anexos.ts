// Validação dos anexos do chat: só imagens (JPEG, PNG, WebP) e PDF, até 3 MB,
// com conferência da assinatura real do arquivo (não basta o nome dizer que é).

import { NovoAnexo } from '@/lib/store';

export const TAMANHO_MAXIMO_ANEXO = 3 * 1024 * 1024; // 3 MB

export const MIMES_PERMITIDOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

function assinaturaConfere(mime: string, inicio: Buffer): boolean {
  if (mime === 'image/jpeg') {
    return inicio[0] === 0xff && inicio[1] === 0xd8 && inicio[2] === 0xff;
  }
  if (mime === 'image/png') {
    return inicio[0] === 0x89 && inicio[1] === 0x50 && inicio[2] === 0x4e && inicio[3] === 0x47;
  }
  if (mime === 'image/webp') {
    return (
      inicio.toString('ascii', 0, 4) === 'RIFF' && inicio.toString('ascii', 8, 12) === 'WEBP'
    );
  }
  if (mime === 'application/pdf') {
    return inicio.toString('ascii', 0, 4) === '%PDF';
  }
  return false;
}

export function validarAnexo(bruto: unknown): { anexo: NovoAnexo } | { erro: string } {
  if (typeof bruto !== 'object' || bruto === null) {
    return { erro: 'Anexo inválido.' };
  }
  const { nome, mime, dados_base64 } = bruto as {
    nome?: unknown;
    mime?: unknown;
    dados_base64?: unknown;
  };

  if (typeof mime !== 'string' || !(MIMES_PERMITIDOS as readonly string[]).includes(mime)) {
    return { erro: 'Só aceitamos fotos (JPG, PNG, WebP) e PDF.' };
  }
  if (typeof dados_base64 !== 'string' || dados_base64.length === 0) {
    return { erro: 'Anexo vazio. Escolha o arquivo de novo.' };
  }
  if (dados_base64.length > Math.ceil((TAMANHO_MAXIMO_ANEXO * 4) / 3) + 8) {
    return { erro: 'O arquivo passa de 3 MB. Envie um arquivo menor.' };
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(dados_base64)) {
    return { erro: 'Anexo corrompido. Escolha o arquivo de novo.' };
  }

  let dados: Buffer;
  try {
    dados = Buffer.from(dados_base64, 'base64');
  } catch {
    return { erro: 'Anexo corrompido. Escolha o arquivo de novo.' };
  }
  if (dados.length === 0 || dados.length > TAMANHO_MAXIMO_ANEXO) {
    return { erro: 'O arquivo passa de 3 MB. Envie um arquivo menor.' };
  }
  if (!assinaturaConfere(mime, dados.subarray(0, 12))) {
    return { erro: 'O arquivo não parece ser do tipo informado. Tente de novo.' };
  }

  const nomeLimpo = (typeof nome === 'string' ? nome : 'arquivo')
    .replace(/[\\/:*?"<>|\r\n]/g, '_')
    .trim()
    .slice(-100);

  return {
    anexo: {
      nome: nomeLimpo || 'arquivo',
      mime,
      tamanho: dados.length,
      dados_base64,
    },
  };
}
