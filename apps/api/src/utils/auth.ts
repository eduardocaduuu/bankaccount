import type { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env.js';

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = request.headers['x-internal-token'];

  if (!token) {
    return reply.status(401).send({
      success: false,
      error: 'Token de autenticação não fornecido',
    });
  }

  if (token !== env.API_INTERNAL_TOKEN) {
    return reply.status(403).send({
      success: false,
      error: 'Token inválido',
    });
  }
}
