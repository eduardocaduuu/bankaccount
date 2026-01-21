import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@controle-ponto/db';
import type { ApiResponse, Employee, CreateEmployeeDto, UpdateEmployeeDto } from '@controle-ponto/types';

const createEmployeeSchema = z.object({
  name: z.string().min(1).max(200),
  solidesEmployeeId: z.string().min(1),
  slackUserId: z.string().optional(),
  sectorId: z.string().min(1),
});

const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slackUserId: z.string().nullable().optional(),
  sectorId: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

const querySchema = z.object({
  sectorId: z.string().optional(),
  active: z.string().transform((v) => v === 'true').optional(),
});

export async function employeesRoutes(app: FastifyInstance) {
  // GET /employees
  app.get<{ Querystring: { sectorId?: string; active?: string } }>('/employees', async (request) => {
    const query = querySchema.parse(request.query);

    const employees = await prisma.employee.findMany({
      where: {
        ...(query.sectorId && { sectorId: query.sectorId }),
        ...(query.active !== undefined && { active: query.active }),
      },
      include: {
        sector: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: employees,
    };
  });

  // GET /employees/:id
  app.get<{ Params: { id: string } }>('/employees/:id', async (request, reply) => {
    const { id } = request.params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        sector: true,
        occurrences: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        dailyWorklogs: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });

    if (!employee) {
      return reply.status(404).send({
        success: false,
        error: 'Colaborador não encontrado',
      });
    }

    return {
      success: true,
      data: employee,
    };
  });

  // POST /employees
  app.post<{ Body: CreateEmployeeDto }>('/employees', async (request, reply) => {
    const result = createEmployeeSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        message: result.error.message,
      });
    }

    const { name, solidesEmployeeId, slackUserId, sectorId } = result.data;

    // Verifica se setor existe
    const sector = await prisma.sector.findUnique({ where: { id: sectorId } });
    if (!sector) {
      return reply.status(400).send({
        success: false,
        error: 'Setor não encontrado',
      });
    }

    // Verifica se já existe com solidesEmployeeId
    const existingSolides = await prisma.employee.findUnique({
      where: { solidesEmployeeId },
    });

    if (existingSolides) {
      return reply.status(409).send({
        success: false,
        error: 'Já existe um colaborador com esse ID Sólides',
      });
    }

    // Verifica se slackUserId já está em uso
    if (slackUserId) {
      const existingSlack = await prisma.employee.findUnique({
        where: { slackUserId },
      });

      if (existingSlack) {
        return reply.status(409).send({
          success: false,
          error: 'Já existe um colaborador com esse Slack User ID',
        });
      }
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        solidesEmployeeId,
        slackUserId,
        sectorId,
      },
    });

    return reply.status(201).send({
      success: true,
      data: employee,
    });
  });

  // PUT /employees/:id
  app.put<{ Params: { id: string }; Body: UpdateEmployeeDto }>('/employees/:id', async (request, reply) => {
    const { id } = request.params;
    const result = updateEmployeeSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        message: result.error.message,
      });
    }

    const employee = await prisma.employee.findUnique({ where: { id } });

    if (!employee) {
      return reply.status(404).send({
        success: false,
        error: 'Colaborador não encontrado',
      });
    }

    const { sectorId, slackUserId, ...rest } = result.data;

    // Verifica se setor existe
    if (sectorId) {
      const sector = await prisma.sector.findUnique({ where: { id: sectorId } });
      if (!sector) {
        return reply.status(400).send({
          success: false,
          error: 'Setor não encontrado',
        });
      }
    }

    // Verifica se slackUserId já está em uso por outro
    if (slackUserId && slackUserId !== employee.slackUserId) {
      const existingSlack = await prisma.employee.findUnique({
        where: { slackUserId },
      });

      if (existingSlack) {
        return reply.status(409).send({
          success: false,
          error: 'Já existe um colaborador com esse Slack User ID',
        });
      }
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...rest,
        ...(sectorId && { sectorId }),
        ...(slackUserId !== undefined && { slackUserId }),
      },
    });

    return {
      success: true,
      data: updated,
    };
  });
}
