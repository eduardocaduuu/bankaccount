import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, type OccurrenceStatus, type OccurrenceType } from '@controle-ponto/db';
import type { ApiResponse, Occurrence, OccurrenceQueryDto } from '@controle-ponto/types';

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['OPEN', 'ACK', 'RESOLVED']).optional(),
  employeeId: z.string().optional(),
  type: z.enum(['LATE', 'OVER', 'UNDER', 'INCOMPLETE']).optional(),
});

export async function occurrencesRoutes(app: FastifyInstance) {
  // GET /occurrences
  app.get<{ Querystring: OccurrenceQueryDto }>('/occurrences', async (request) => {
    const query = querySchema.parse(request.query);

    const where: {
      date?: Date;
      status?: OccurrenceStatus;
      employeeId?: string;
      type?: OccurrenceType;
    } = {};

    if (query.date) {
      where.date = new Date(query.date);
    }

    if (query.status) {
      where.status = query.status as OccurrenceStatus;
    }

    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }

    if (query.type) {
      where.type = query.type as OccurrenceType;
    }

    const occurrences = await prisma.occurrence.findMany({
      where,
      include: {
        employee: {
          include: {
            sector: true,
          },
        },
        justifications: true,
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return {
      success: true,
      data: occurrences,
    };
  });

  // GET /occurrences/:id
  app.get<{ Params: { id: string } }>('/occurrences/:id', async (request, reply) => {
    const { id } = request.params;

    const occurrence = await prisma.occurrence.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            sector: true,
          },
        },
        justifications: {
          orderBy: { createdAt: 'desc' },
        },
        notifications: true,
      },
    });

    if (!occurrence) {
      return reply.status(404).send({
        success: false,
        error: 'Ocorrência não encontrada',
      });
    }

    return {
      success: true,
      data: occurrence,
    };
  });

  // POST /occurrences/:id/ack - Colaborador clica "OK"
  app.post<{ Params: { id: string } }>('/occurrences/:id/ack', async (request, reply) => {
    const { id } = request.params;

    const occurrence = await prisma.occurrence.findUnique({ where: { id } });

    if (!occurrence) {
      return reply.status(404).send({
        success: false,
        error: 'Ocorrência não encontrada',
      });
    }

    if (occurrence.status !== 'OPEN') {
      return reply.status(400).send({
        success: false,
        error: 'Ocorrência já foi processada',
      });
    }

    const updated = await prisma.occurrence.update({
      where: { id },
      data: { status: 'ACK' },
    });

    return {
      success: true,
      data: updated,
    };
  });

  // POST /occurrences/:id/resolve - Gestor decide OK/ajuste
  app.post<{
    Params: { id: string };
    Body: { action: 'approve' | 'adjust' | 'request_details'; note?: string };
  }>('/occurrences/:id/resolve', async (request, reply) => {
    const { id } = request.params;
    const { action, note } = request.body;

    const occurrence = await prisma.occurrence.findUnique({
      where: { id },
      include: { justifications: true },
    });

    if (!occurrence) {
      return reply.status(404).send({
        success: false,
        error: 'Ocorrência não encontrada',
      });
    }

    if (occurrence.status === 'RESOLVED') {
      return reply.status(400).send({
        success: false,
        error: 'Ocorrência já foi resolvida',
      });
    }

    if (action === 'approve') {
      const updated = await prisma.occurrence.update({
        where: { id },
        data: { status: 'RESOLVED' },
      });

      return {
        success: true,
        data: updated,
        message: 'Ocorrência aprovada',
      };
    }

    if (action === 'adjust' || action === 'request_details') {
      // Mantém como ACK para que o colaborador possa responder
      const updated = await prisma.occurrence.update({
        where: { id },
        data: { status: 'ACK' },
      });

      return {
        success: true,
        data: updated,
        message: action === 'adjust'
          ? 'Solicitação de ajuste registrada'
          : 'Solicitação de mais detalhes registrada',
      };
    }

    return reply.status(400).send({
      success: false,
      error: 'Ação inválida',
    });
  });

  // GET /occurrences/stats - Estatísticas
  app.get<{ Querystring: { date?: string } }>('/occurrences/stats', async (request) => {
    const { date } = request.query;

    const dateFilter = date ? new Date(date) : new Date();

    const [total, open, ack, resolved, byType] = await Promise.all([
      prisma.occurrence.count({ where: { date: dateFilter } }),
      prisma.occurrence.count({ where: { date: dateFilter, status: 'OPEN' } }),
      prisma.occurrence.count({ where: { date: dateFilter, status: 'ACK' } }),
      prisma.occurrence.count({ where: { date: dateFilter, status: 'RESOLVED' } }),
      prisma.occurrence.groupBy({
        by: ['type'],
        where: { date: dateFilter },
        _count: true,
      }),
    ]);

    return {
      success: true,
      data: {
        date: dateFilter.toISOString().split('T')[0],
        total,
        open,
        ack,
        resolved,
        byType: byType.reduce(
          (acc, item) => {
            acc[item.type] = item._count;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    };
  });
}
