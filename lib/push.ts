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
    await Promise.all(
      inscricoes.map(async (inscricao) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: inscricao.endpoint,
              keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
            },
            JSON.stringify(carga)
          );
        } catch (erro) {
          const status = (erro as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await dados.removerInscricaoPush(inscricao.endpoint).catch(() => undefined);
          }
        }
      })
    );
  } catch {
    /* push é melhor esforço */
  }
}
