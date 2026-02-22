import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { agents } from '../db/schema/index.js';
import { authenticate } from '../middleware/auth.js';
import { CreateAgentSchema, UpdateAgentSchema, HTTP_STATUS, ERROR_CODES } from '@ai-desktop/shared';
import { encrypt } from '../services/crypto.js';
import { auditLog, AUDIT_ACTIONS } from '../services/audit.js';

export default async function agentsRoutes(fastify: FastifyInstance) {
  // List user's agents
  fastify.get(
    '/',
    {
      schema: {
        tags: ['agents'],
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                avatarUrl: z.string().nullable(),
                model: z.string(),
                capabilities: z.array(z.string()),
                isActive: z.boolean(),
                createdAt: z.string(),
              })
            ),
          }),
        },
      },
    },
    async (request) => {
      const user = await authenticate(request);

      const userAgents = await db.query.agents.findMany({
        where: eq(agents.createdBy, user.id),
      });

      return {
        success: true,
        data: userAgents.map((a) => ({
          id: a.id,
          name: a.name,
          avatarUrl: a.avatarUrl,
          model: a.model,
          capabilities: a.capabilities,
          isActive: a.isActive,
          createdAt: a.createdAt.toISOString(),
        })),
      };
    }
  );

  // Create agent
  fastify.post(
    '/',
    {
      schema: {
        tags: ['agents'],
        body: CreateAgentSchema,
        response: {
          201: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string(),
              name: z.string(),
              model: z.string(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const user = await authenticate(request);
      const { name, avatarUrl, systemPrompt, model, capabilities, openrouterApiKey } = request.body;

      const [agent] = await db
        .insert(agents)
        .values({
          name,
          avatarUrl,
          systemPrompt,
          model,
          openrouterApiKeyEncrypted: encrypt(openrouterApiKey),
          capabilities: capabilities ?? ['chat'],
          createdBy: user.id,
        })
        .returning();

      await auditLog({
        action: AUDIT_ACTIONS.AGENT_CREATED,
        userId: user.id,
        targetType: 'agent',
        targetId: agent.id,
        ipAddress: request.ip,
      });

      return reply.status(HTTP_STATUS.CREATED).send({
        success: true,
        data: { id: agent.id, name: agent.name, model: agent.model },
      });
    }
  );

  // Get agent by ID
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['agents'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string(),
              name: z.string(),
              avatarUrl: z.string().nullable(),
              systemPrompt: z.string(),
              model: z.string(),
              capabilities: z.array(z.string()),
              isActive: z.boolean(),
              hasApiKey: z.boolean(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const user = await authenticate(request);
      const { id } = request.params;

      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, id),
      });

      if (!agent || agent.createdBy !== user.id) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Agent not found' },
        });
      }

      return {
        success: true,
        data: {
          id: agent.id,
          name: agent.name,
          avatarUrl: agent.avatarUrl,
          systemPrompt: agent.systemPrompt,
          model: agent.model,
          capabilities: agent.capabilities,
          isActive: agent.isActive,
          hasApiKey: !!agent.openrouterApiKeyEncrypted,
        },
      };
    }
  );

  // Update agent
  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['agents'],
        params: z.object({ id: z.string().uuid() }),
        body: UpdateAgentSchema,
      },
    },
    async (request, reply) => {
      const user = await authenticate(request);
      const { id } = request.params;

      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, id),
      });

      if (!agent || agent.createdBy !== user.id) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Agent not found' },
        });
      }

      const updates: Record<string, unknown> = { ...request.body, updatedAt: new Date() };

      if (request.body.openrouterApiKey) {
        updates.openrouterApiKeyEncrypted = encrypt(request.body.openrouterApiKey);
        delete updates.openrouterApiKey;

        await auditLog({
          action: AUDIT_ACTIONS.AGENT_API_KEY_CHANGED,
          userId: user.id,
          targetType: 'agent',
          targetId: id,
          ipAddress: request.ip,
        });
      }

      const [updated] = await db.update(agents).set(updates).where(eq(agents.id, id)).returning();

      return { success: true, data: updated };
    }
  );

  // Delete agent
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['agents'],
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const user = await authenticate(request);
      const { id } = request.params;

      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, id),
      });

      if (!agent || agent.createdBy !== user.id) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Agent not found' },
        });
      }

      await db.delete(agents).where(eq(agents.id, id));

      await auditLog({
        action: AUDIT_ACTIONS.AGENT_DELETED,
        userId: user.id,
        targetType: 'agent',
        targetId: id,
        ipAddress: request.ip,
      });

      return { success: true };
    }
  );

  // Test agent (send a test message)
  fastify.post(
    '/:id/test',
    {
      schema: {
        tags: ['agents'],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          message: z.string().min(1),
        }),
        config: { rateLimit: { max: 10, timeWindow: 60000 } },
      },
    },
    async (request, reply) => {
      const user = await authenticate(request);
      const { id } = request.params;
      const { message } = request.body;

      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, id),
      });

      if (!agent || agent.createdBy !== user.id) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Agent not found' },
        });
      }

      if (!agent.openrouterApiKeyEncrypted) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: {
            code: ERROR_CODES.AGENT_UNAVAILABLE,
            message: 'Agent has no API key configured',
          },
        });
      }

      // TODO: Call OpenRouter API
      // For now, return a mock response
      return {
        success: true,
        data: {
          response: `[Test response from ${agent.name}] You said: "${message}"`,
          model: agent.model,
        },
      };
    }
  );
}
