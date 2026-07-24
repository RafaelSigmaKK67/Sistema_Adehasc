'use client';

// Anexos do chat: prepara o arquivo no próprio aparelho (fotos são reduzidas
// antes do envio, para economizar internet) e mostra o anexo dentro do balão.

export type AnexoMeta = { id: number; nome: string; mime: string; tamanho: number };
export type AnexoParaEnvio = { nome: string; mime: string; dados_base64: string };

const TAMANHO_MAXIMO = 3 * 1024 * 1024; // 3 MB
const LADO_MAXIMO_IMAGEM = 1600;

export function formatarTamanho(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function arquivoParaBase64(arquivo: Blob): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(String(leitor.result).split(',')[1] || '');
    leitor.onerror = () => rejeitar(new Error('leitura'));
    leitor.readAsDataURL(arquivo);
  });
}

function carregarImagem(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolver, rejeitar) => {
    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.onload = () => {
      URL.revokeObjectURL(url);
      resolver(imagem);
    };
    imagem.onerror = () => {
      URL.revokeObjectURL(url);
      rejeitar(new Error('imagem'));
    };
    imagem.src = url;
  });
}

/** Prepara o arquivo escolhido: reduz fotos e confere tipo e tamanho. */
export async function prepararArquivo(
  arquivo: File
): Promise<{ anexo: AnexoParaEnvio } | { erro: string }> {
  if (arquivo.type === 'application/pdf') {
    if (arquivo.size > TAMANHO_MAXIMO) {
      return { erro: 'O PDF passa de 3 MB. Envie um arquivo menor.' };
    }
    return {
      anexo: {
        nome: arquivo.name || 'documento.pdf',
        mime: 'application/pdf',
        dados_base64: await arquivoParaBase64(arquivo),
      },
    };
  }

  if (arquivo.type.startsWith('image/')) {
    try {
      const imagem = await carregarImagem(arquivo);
      const escala = Math.min(1, LADO_MAXIMO_IMAGEM / Math.max(imagem.width, imagem.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(imagem.width * escala));
      canvas.height = Math.max(1, Math.round(imagem.height * escala));
      const contexto = canvas.getContext('2d');
      if (!contexto) throw new Error('canvas');
      contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      const base64 = dataUrl.split(',')[1] || '';
      if (base64.length > (TAMANHO_MAXIMO * 4) / 3) {
        return { erro: 'A foto ficou grande demais. Tente outra foto.' };
      }
      const nomeBase = (arquivo.name || 'foto').replace(/\.[^.]+$/, '');
      return {
        anexo: { nome: `${nomeBase}.jpg`, mime: 'image/jpeg', dados_base64: base64 },
      };
    } catch {
      return { erro: 'Não conseguimos ler esta foto. Tente outra.' };
    }
  }

  return { erro: 'Só aceitamos fotos (JPG, PNG, WebP) e PDF.' };
}

export function AnexoNoBalao({ anexo }: { anexo: AnexoMeta }) {
  const endereco = `/api/anexos/${anexo.id}`;
  if (anexo.mime.startsWith('image/')) {
    return (
      <a href={endereco} target="_blank" rel="noopener noreferrer" className="balao-anexo-imagem">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={endereco} alt={`Foto enviada: ${anexo.nome}`} loading="lazy" />
      </a>
    );
  }
  return (
    <a href={endereco} target="_blank" rel="noopener noreferrer" className="balao-anexo-arquivo">
      📄 {anexo.nome} <span className="texto-suave">({formatarTamanho(anexo.tamanho)})</span>
    </a>
  );
}
