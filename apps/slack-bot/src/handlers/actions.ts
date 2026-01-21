import type { App, BlockAction, ButtonAction } from '@slack/bolt';
import { apiClient } from '../services/apiClient.js';
import { buildJustificationModal } from '../services/messages.js';
import { logger } from '../utils/logger.js';

export function registerActionHandlers(app: App): void {
  // Explain occurrence - abre modal
  app.action<BlockAction<ButtonAction>>('explain_occurrence', async ({ ack, body, client }) => {
    await ack();

    const occurrenceId = body.actions[0].value;

    logger.info({ occurrenceId, userId: body.user.id }, 'Opening justification modal');

    try {
      const modal = buildJustificationModal(occurrenceId);

      await client.views.open({
        trigger_id: body.trigger_id,
        view: modal,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to open modal');
    }
  });

  // ACK occurrence - colaborador clica OK
  app.action<BlockAction<ButtonAction>>('ack_occurrence', async ({ ack, body, client, respond }) => {
    await ack();

    const occurrenceId = body.actions[0].value;

    logger.info({ occurrenceId, userId: body.user.id }, 'Acknowledging occurrence');

    try {
      const success = await apiClient.ackOccurrence(occurrenceId);

      if (success) {
        await respond({
          text: ':white_check_mark: Ocorrência confirmada.',
          replace_original: true,
        });
      } else {
        await respond({
          text: ':x: Erro ao confirmar ocorrência.',
          replace_original: false,
        });
      }
    } catch (error) {
      logger.error({ error }, 'Failed to ack occurrence');
      await respond({
        text: ':x: Erro ao confirmar ocorrência.',
        replace_original: false,
      });
    }
  });

  // Request correction
  app.action<BlockAction<ButtonAction>>('request_correction', async ({ ack, body, respond }) => {
    await ack();

    logger.info({ userId: body.user.id }, 'User requested correction');

    await respond({
      text: ':pencil: Para corrigir marcações, acesse o sistema Sólides ou entre em contato com o RH.',
      replace_original: false,
    });
  });

  // Manager approve
  app.action<BlockAction<ButtonAction>>('manager_approve', async ({ ack, body, respond }) => {
    await ack();

    const occurrenceId = body.actions[0].value;

    logger.info({ occurrenceId, userId: body.user.id }, 'Manager approving');

    try {
      const success = await apiClient.resolveOccurrence(occurrenceId, 'approve');

      if (success) {
        await respond({
          text: ':white_check_mark: Justificativa aprovada.',
          replace_original: true,
        });
      } else {
        await respond({
          text: ':x: Erro ao aprovar justificativa.',
          replace_original: false,
        });
      }
    } catch (error) {
      logger.error({ error }, 'Failed to approve');
      await respond({
        text: ':x: Erro ao aprovar justificativa.',
        replace_original: false,
      });
    }
  });

  // Manager adjust
  app.action<BlockAction<ButtonAction>>('manager_adjust', async ({ ack, body, respond }) => {
    await ack();

    const occurrenceId = body.actions[0].value;

    logger.info({ occurrenceId, userId: body.user.id }, 'Manager requesting adjustment');

    try {
      const success = await apiClient.resolveOccurrence(occurrenceId, 'adjust');

      if (success) {
        await respond({
          text: ':memo: Solicitação de ajuste registrada. O colaborador será notificado.',
          replace_original: true,
        });
      } else {
        await respond({
          text: ':x: Erro ao solicitar ajuste.',
          replace_original: false,
        });
      }
    } catch (error) {
      logger.error({ error }, 'Failed to request adjustment');
      await respond({
        text: ':x: Erro ao solicitar ajuste.',
        replace_original: false,
      });
    }
  });

  // Manager request details
  app.action<BlockAction<ButtonAction>>('manager_request_details', async ({ ack, body, respond }) => {
    await ack();

    const occurrenceId = body.actions[0].value;

    logger.info({ occurrenceId, userId: body.user.id }, 'Manager requesting details');

    try {
      const success = await apiClient.resolveOccurrence(occurrenceId, 'request_details');

      if (success) {
        await respond({
          text: ':speech_balloon: Solicitação de mais detalhes enviada ao colaborador.',
          replace_original: true,
        });
      } else {
        await respond({
          text: ':x: Erro ao solicitar detalhes.',
          replace_original: false,
        });
      }
    } catch (error) {
      logger.error({ error }, 'Failed to request details');
      await respond({
        text: ':x: Erro ao solicitar detalhes.',
        replace_original: false,
      });
    }
  });
}
