// Notificações push no celular (Web Push). Precisa das variáveis VAPID_PUBLIC_KEY
// e VAPID_PRIVATE_KEY no ambiente — sem elas, o recurso fica desligado sem quebrar nada.

import webpush from 'web-push';
import { Dados } from '@/lib/store';

export function pushConfigurado(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function chavePublicaPush(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

let vapidPronto = false;

function prepararVapid(): boolean {
  if (!pushConfigurado()) return false;
  if (!vapidPronto) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:contato@adehasc.com.br',
      process.env.VAPID_PUBLIC_KEY as string,
      process.env.VAPID_PRIVATE_KEY as string
    );
    vapidPronto = true;
  }
  return true;
}

export type CargaPush = { titulo: string; corpo: string; url?: string };

// Um aparelho que não responde não pode segurar a requisição inteira.
const TEMPO_LIMITE_PUSH_MS = 4000;
const VALIDADE_PUSH_S = 24 * 60 * 60;

/**
 * Envia a notificação para todos os aparelhos do morador. Nunca lança erro:
 * falha de push não pode derrubar a ação principal (mudar etapa, enviar
 * mensagem etc.). Inscrições mortas (aparelho trocado) são removidas.
 */
export async function notificarMorador(
  dados: Dados,
  moradorId: number,
  carga: CargaPush
): Promise<void> {
  try {
    if (!prepararVapid()) return;
    const inscricoes = await dados.listarInscricoesPush(moradorId);
    if (inscricoes.length === 0) return;
    await Promise.all(
      inscricoes.map(async (inscricao) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: inscricao.endpoint,
              keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
            },
            JSON.stringify(carga),
            { timeout: TEMPO_LIMITE_PUSH_MS, TTL: VALIDADE_PUSH_S }
          );
        } catch (erro) {
          const status = (erro as { statusCode?: number }).statusCode;
          // 404/410: inscrição morta. 401/403: chaves VAPID trocadas — o
          // aparelho precisa se inscrever de novo, então também limpamos.
          if (status === 404 || status === 410 || status === 401 || status === 403) {
            await dados.removerInscricaoPush(inscricao.endpoint).catch(() => undefined);
          }
          console.warn(
            `[push] falha ao notificar morador ${moradorId} (status ${status ?? 'sem status'})`
          );
        }
      })
    );
  } catch (erro) {
    console.warn('[push] erro geral ao notificar:', erro instanceof Error ? erro.message : erro);
  }
}
