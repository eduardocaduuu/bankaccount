import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, type JustificationCategory } from '@controle-ponto/db';
import type { ApiResponse, Justification, CreateJustificationDto } from '@controle-ponto/types';

const createJustificationSchema = z.object({
  occurrenceId: z.string().min(1),
  text: z.string().min(1).max(2000),
  category: z.enum(['MEDICAL', 'PERSONAL', 'TRAFFIC', 'WORK_OFFSITE', 'MEETING', 'OTHER']).optional(),
  notifyHR: z.boolean().default(false),
});

export async function justificationsRoutes(app: FastifyInstance) {
  // POST /justifications
  app.post<{ Body: CreateJustificationDto }>('/justifications', async (request, reply) => {
    const result = createJustificationSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        message: result.error.message,
      });
    }

    const { occurrenceId, text, category, notifyHR } = result.data;

    // Busca a ocorrência
    const occurrence = await prisma.occurrence.findUnique({
      where: { id: occurrenceId },
      include: {
        employee: {
          include: {
            sector: true,
          },
        },
      },
    });

    if (!occurrence) {
      return reply.status(404).send({
        success: false,
        error: 'Ocorrência não encontrada',
      });
    }

    // Cria a justificativa
    const justification = await prisma.justification.create({
      data: {
        occurrenceId,
        employeeId: occurrence.employeeId,
        date: occurrence.date,
        text,
        category: category as JustificationCategory | undefined,
        notifyHR,
      },
    });

    // Atualiza status da ocorrência para ACK se estava OPEN
    if (occurrence.status === 'OPEN') {
      await prisma.occurrence.update({
        where: { id: occurrenceId },
        data: { status: 'ACK' },
      });
    }

    return reply.status(201).send({
      success: true,
      data: {
        justification,
        occurrence,
        managerSlackUserId: occurrence.employee.sector.managerSlackUserId,
      },
    });
  });

  // GET /justifications
  app.get<{ Querystring: { occurrenceId?: string; employeeId?: string; date?: string } }>(
    '/justifications',
    async (request) => {
      const { occurrenceId, employeeId, date } = request.query;

      const justifications = await prisma.justification.findMany({
        where: {
          ...(occurrenceId && { occurrenceId }),
          ...(employeeId && { employeeId }),
          ...(date && { date: new Date(date) }),
        },
        include: {
          occurrence: true,
          employee: {
            include: {
              sector: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: justifications,
      };
    }
  );

  // GET /justifications/:id
  app.get<{ Params: { id: string } }>('/justifications/:id', async (request, reply) => {
    const { id } = request.params;

    const justification = await prisma.justification.findUnique({
      where: { id },
      include: {
        occurrence: true,
        employee: {
          include: {
            sector: true,
          },
        },
      },
    });

    if (!justification) {
      return reply.status(404).send({
        success: false,
        error: 'Justificativa não encontrada',
      });
    }

    return {
      success: true,
      data: justification,
    };
  });
}
