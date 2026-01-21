import type { App, ViewSubmitAction, SlackViewAction } from '@slack/bolt';
import { apiClient } from '../services/apiClient.js';
import { buildManagerNotificationBlocks } from '../services/messages.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import type { JustificationCategory, OccurrenceType } from '@controle-ponto/types';

export function registerModalHandlers(app: App): void {
  app.view('justification_modal', async ({ ack, body, view, client }) => {
    await ack();

    const occurrenceId = view.private_metadata;
    const userId = body.user.id;

    // Extrai valores do modal
    const textBlock = view.state.values.justification_text_block;
    const categoryBlock = view.state.values.justification_category_block;
    const notifyHrBlock = view.state.values.notify_hr_block;

    const text = textBlock?.justification_text?.value || '';
    const category = categoryBlock?.justification_category?.selected_option?.value as
      | JustificationCategory
      | undefined;
    const notifyHR =
      (notifyHrBlock?.notify_hr?.selected_options?.length || 0) > 0;

    logger.info(
      {
        occurrenceId,
        userId,
        category,
        notifyHR,
        textLength: text.length,
      },
      'Processing justification'
    );

    try {
      // Cria justificativa na API
      const result = await apiClient.createJustification({
        occurrenceId,
        text,
        category,
        notifyHR,
      });

      if (!result) {
        await client.chat.postMessage({
          channel: userId,
          text: ':x: Erro ao enviar justificativa. Tente novamente.',
        });
        return;
      }

      // Confirma para o colaborador
      await client.chat.postMessage({
        channel: userId,
        text: ':white_check_mark: Justificativa enviada com sucesso! Seu gestor será notificado.',
      });

      // Busca dados da ocorrência para enviar ao gestor
      const occurrence = await apiClient.getOccurrenceById(occurrenceId);

      if (!occurrence) {
        logger.warn({ occurrenceId }, 'Occurrence not found for manager notification');
        return;
      }

      // Busca nome do colaborador
      const employee = await apiClient.getEmployeeBySlackId(userId);
      const employeeName = employee?.name || 'Colaborador';

      // Envia notificação para o gestor
      const managerSlackUserId = result.managerSlackUserId;

      if (managerSlackUserId && managerSlackUserId !== 'PENDING') {
        const blocks = buildManagerNotificationBlocks(
          employeeName,
          occurrence.type as OccurrenceType,
          occurrence.minutes,
          text,
          category || null,
          occurrenceId
        );

        await client.chat.postMessage({
          channel: managerSlackUserId,
          text: `Justificativa recebida de ${employeeName}`,
          blocks,
        });

        logger.info(
          { managerSlackUserId, occurrenceId },
          'Manager notified'
        );
      }

      // Notifica RH se solicitado
      if (notifyHR && env.HR_SLACK_USER_ID) {
        const hrBlocks = buildManagerNotificationBlocks(
          employeeName,
          occurrence.type as OccurrenceType,
          occurrence.minutes,
          text,
          category || null,
          occurrenceId
        );

        await client.chat.postMessage({
          channel: env.HR_SLACK_USER_ID,
          text: `[Notificação RH] Justificativa de ${employeeName}`,
          blocks: hrBlocks,
        });

        logger.info({ occurrenceId }, 'HR notified');
      }

      // Também pode enviar para canal de RH
      if (notifyHR && env.HR_CHANNEL_ID) {
        await client.chat.postMessage({
          channel: env.HR_CHANNEL_ID,
          text: `:bell: Justificativa de *${employeeName}* marcada para análise do RH.\n\n*Motivo:* ${text.substring(0, 100)}...`,
        });
      }
    } catch (error) {
      logger.error({ error, occurrenceId }, 'Failed to process justification');

      await client.chat.postMessage({
        channel: userId,
        text: ':x: Erro ao processar justificativa. Tente novamente.',
      });
    }
  });
}
