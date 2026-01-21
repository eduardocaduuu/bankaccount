import type { KnownBlock, Block } from '@slack/bolt';
import type { Occurrence, OccurrenceType, JustificationCategory } from '@controle-ponto/types';
import { formatMinutes, formatDateBR } from '../utils/dates.js';

const OCCURRENCE_LABELS: Record<OccurrenceType, string> = {
  LATE: 'Atraso',
  OVER: 'Hora Extra',
  UNDER: 'Falta de Horas',
  INCOMPLETE: 'Marcações Incompletas',
};

const OCCURRENCE_EMOJIS: Record<OccurrenceType, string> = {
  LATE: ':clock9:',
  OVER: ':chart_with_upwards_trend:',
  UNDER: ':chart_with_downwards_trend:',
  INCOMPLETE: ':warning:',
};

const CATEGORY_LABELS: Record<JustificationCategory, string> = {
  MEDICAL: 'Médico',
  PERSONAL: 'Pessoal',
  TRAFFIC: 'Trânsito',
  WORK_OFFSITE: 'Trabalho externo',
  MEETING: 'Reunião',
  OTHER: 'Outro',
};

export function buildOccurrenceNotificationBlocks(
  occurrence: Occurrence & { employee?: { name: string } }
): (KnownBlock | Block)[] {
  const typeLabel = OCCURRENCE_LABELS[occurrence.type as OccurrenceType];
  const emoji = OCCURRENCE_EMOJIS[occurrence.type as OccurrenceType];
  const minutesStr =
    occurrence.minutes > 0 ? formatMinutes(occurrence.minutes) : '';

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} Ocorrência: ${typeLabel}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Data:* ${formatDateBR(occurrence.date)}\n${minutesStr ? `*Tempo:* ${minutesStr}\n` : ''}`,
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Explicar agora',
            emoji: true,
          },
          style: 'primary',
          action_id: 'explain_occurrence',
          value: occurrence.id,
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'OK',
            emoji: true,
          },
          action_id: 'ack_occurrence',
          value: occurrence.id,
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Corrigir marcação',
            emoji: true,
          },
          action_id: 'request_correction',
          value: occurrence.id,
        },
      ],
    },
  ];
}

export function buildJustificationModal(occurrenceId: string): {
  type: 'modal';
  callback_id: string;
  private_metadata: string;
  title: { type: 'plain_text'; text: string };
  submit: { type: 'plain_text'; text: string };
  close: { type: 'plain_text'; text: string };
  blocks: (KnownBlock | Block)[];
} {
  return {
    type: 'modal',
    callback_id: 'justification_modal',
    private_metadata: occurrenceId,
    title: {
      type: 'plain_text',
      text: 'Justificar Ocorrência',
    },
    submit: {
      type: 'plain_text',
      text: 'Enviar',
    },
    close: {
      type: 'plain_text',
      text: 'Cancelar',
    },
    blocks: [
      {
        type: 'input',
        block_id: 'justification_text_block',
        element: {
          type: 'plain_text_input',
          action_id: 'justification_text',
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'Descreva o motivo da ocorrência...',
          },
        },
        label: {
          type: 'plain_text',
          text: 'Justificativa',
        },
      },
      {
        type: 'input',
        block_id: 'justification_category_block',
        optional: true,
        element: {
          type: 'static_select',
          action_id: 'justification_category',
          placeholder: {
            type: 'plain_text',
            text: 'Selecione um motivo',
          },
          options: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
            text: {
              type: 'plain_text' as const,
              text: label,
            },
            value,
          })),
        },
        label: {
          type: 'plain_text',
          text: 'Categoria (opcional)',
        },
      },
      {
        type: 'input',
        block_id: 'notify_hr_block',
        optional: true,
        element: {
          type: 'checkboxes',
          action_id: 'notify_hr',
          options: [
            {
              text: {
                type: 'plain_text',
                text: 'Avisar RH',
              },
              value: 'notify_hr',
            },
          ],
        },
        label: {
          type: 'plain_text',
          text: 'Notificações',
        },
      },
    ],
  };
}

export function buildManagerNotificationBlocks(
  employeeName: string,
  occurrenceType: OccurrenceType,
  minutes: number,
  justificationText: string,
  justificationCategory: JustificationCategory | null,
  occurrenceId: string
): (KnownBlock | Block)[] {
  const typeLabel = OCCURRENCE_LABELS[occurrenceType];
  const emoji = OCCURRENCE_EMOJIS[occurrenceType];
  const minutesStr = minutes > 0 ? formatMinutes(minutes) : '';
  const categoryStr = justificationCategory
    ? CATEGORY_LABELS[justificationCategory]
    : '';

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} Justificativa recebida`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Colaborador:* ${employeeName}\n*Tipo:* ${typeLabel}${minutesStr ? ` (${minutesStr})` : ''}\n${categoryStr ? `*Categoria:* ${categoryStr}\n` : ''}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Justificativa:*\n>${justificationText.replace(/\n/g, '\n>')}`,
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'OK',
            emoji: true,
          },
          style: 'primary',
          action_id: 'manager_approve',
          value: occurrenceId,
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Precisa ajuste',
            emoji: true,
          },
          action_id: 'manager_adjust',
          value: occurrenceId,
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Pedir mais detalhes',
            emoji: true,
          },
          action_id: 'manager_request_details',
          value: occurrenceId,
        },
      ],
    },
  ];
}

export function buildDailySummaryBlocks(
  occurrences: Occurrence[]
): (KnownBlock | Block)[] {
  if (occurrences.length === 0) {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':white_check_mark: *Resumo do dia:* Nenhuma ocorrência pendente.',
        },
      },
    ];
  }

  const summary = occurrences.reduce(
    (acc, occ) => {
      acc[occ.type as OccurrenceType] = (acc[occ.type as OccurrenceType] || 0) + 1;
      return acc;
    },
    {} as Record<OccurrenceType, number>
  );

  const summaryText = Object.entries(summary)
    .map(([type, count]) => {
      const label = OCCURRENCE_LABELS[type as OccurrenceType];
      const emoji = OCCURRENCE_EMOJIS[type as OccurrenceType];
      return `${emoji} ${label}: ${count}`;
    })
    .join('\n');

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: ':clipboard: Resumo do dia',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: summaryText,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Total: ${occurrences.length} ocorrência(s) pendente(s)`,
        },
      ],
    },
  ];
}
