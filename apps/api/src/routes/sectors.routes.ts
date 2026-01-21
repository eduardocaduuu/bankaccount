import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@controle-ponto/db';
import type { ApiResponse, Sector, CreateSectorDto } from '@controle-ponto/types';

const createSectorSchema = z.object({
  name: z.string().min(1).max(100),
  managerSlackUserId: z.string().min(1),
});

const updateSectorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  managerSlackUserId: z.string().min(1).optional(),
});

export async function sectorsRoutes(app: FastifyInstance) {
  // GET /sectors
  app.get('/sectors', async (): Promise<ApiResponse<Sector[]>> => {
    const sectors = await prisma.sector.findMany({
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: sectors as Sector[],
    };
  });

  // GET /sectors/:id
  app.get<{ Params: { id: string } }>('/sectors/:id', async (request, reply) => {
    const { id } = request.params;

    const sector = await prisma.sector.findUnique({
      where: { id },
      include: {
        employees: {
          where: { active: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!sector) {
      return reply.status(404).send({
        success: false,
        error: 'Setor não encontrado',
      });
    }

    return {
      success: true,
      data: sector,
    };
  });

  // POST /sectors
  app.post<{ Body: CreateSectorDto }>('/sectors', async (request, reply) => {
    const result = createSectorSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        message: result.error.message,
      });
    }

    const { name, managerSlackUserId } = result.data;

    // Verifica se já existe setor com esse nome
    const existing = await prisma.sector.findUnique({
      where: { name },
    });

    if (existing) {
      return reply.status(409).send({
        success: false,
        error: 'Já existe um setor com esse nome',
      });
    }

    const sector = await prisma.sector.create({
      data: {
        name,
        managerSlackUserId,
      },
    });

    return reply.status(201).send({
      success: true,
      data: sector,
    });
  });

  // PUT /sectors/:id
  app.put<{ Params: { id: string }; Body: CreateSectorDto }>('/sectors/:id', async (request, reply) => {
    const { id } = request.params;
    const result = updateSectorSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        message: result.error.message,
      });
    }

    const sector = await prisma.sector.findUnique({ where: { id } });

    if (!sector) {
      return reply.status(404).send({
        success: false,
        error: 'Setor não encontrado',
      });
    }

    const updated = await prisma.sector.update({
      where: { id },
      data: result.data,
    });

    return {
      success: true,
      data: updated,
    };
  });

  // DELETE /sectors/:id
  app.delete<{ Params: { id: string } }>('/sectors/:id', async (request, reply) => {
    const { id } = request.params;

    const sector = await prisma.sector.findUnique({ where: { id } });

    if (!sector) {
      return reply.status(404).send({
        success: false,
        error: 'Setor não encontrado',
      });
    }

    // Verifica se há funcionários no setor
    const employeeCount = await prisma.employee.count({
      where: { sectorId: id },
    });

    if (employeeCount > 0) {
      return reply.status(409).send({
        success: false,
        error: 'Não é possível excluir setor com funcionários',
      });
    }

    await prisma.sector.delete({ where: { id } });

    return {
      success: true,
      message: 'Setor excluído com sucesso',
    };
  });
}
