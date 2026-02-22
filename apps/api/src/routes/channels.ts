import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { channels } from '../db/schema/index.js';
import { requireWorkspaceMember, requireMember } from '../middleware/rbac.js';
import {
  CreateChannelSchema,
  UpdateChannelSchema,
  HTTP_STATUS,
  ERROR_CODES,
} from '@ai-desktop/shared';

export default async function channelsRoutes(fastify: FastifyInstance) {
  // List channels in workspace
  fastify.get(
    '/workspaces/:workspaceId/channels',
    {
      schema: {
        tags: ['channels'],
        params: z.object({ workspaceId: z.string().uuid() }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                description: z.string().nullable(),
                isDefault: z.boolean(),
                createdAt: z.string(),
              })
            ),
          }),
        },
      },
    },
    async (request) => {
      const { workspaceId } = await requireWorkspaceMember(request);

      const workspaceChannels = await db.query.channels.findMany({
        where: eq(channels.workspaceId, workspaceId),
        orderBy: [channels.createdAt],
      });

      return {
        success: true,
        data: workspaceChannels.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          isDefault: c.isDefault === 1,
          createdAt: c.createdAt.toISOString(),
        })),
      };
    }
  );

  // Create channel
  fastify.post(
    '/workspaces/:workspaceId/channels',
    {
      schema: {
        tags: ['channels'],
        params: z.object({ workspaceId: z.string().uuid() }),
        body: CreateChannelSchema,
      },
    },
    async (request, reply) => {
      const { workspaceId } = await requireMember(request);
      const { name, description } = request.body;

      const [channel] = await db
        .insert(channels)
        .values({
          workspaceId,
          name,
          description,
          isDefault: 0,
        })
        .returning();

      return reply.status(HTTP_STATUS.CREATED).send({
        success: true,
        data: {
          id: channel.id,
          name: channel.name,
          description: channel.description,
          isDefault: false,
          createdAt: channel.createdAt.toISOString(),
        },
      });
    }
  );

  // Get channel
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['channels'],
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, id),
        with: { workspace: true },
      });

      if (!channel) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Channel not found' },
        });
      }

      // Check workspace access
      // TODO: Add proper auth check

      return {
        success: true,
        data: {
          id: channel.id,
          workspaceId: channel.workspaceId,
          name: channel.name,
          description: channel.description,
          isDefault: channel.isDefault === 1,
          createdAt: channel.createdAt.toISOString(),
        },
      };
    }
  );

  // Update channel
  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['channels'],
        params: z.object({ id: z.string().uuid() }),
        body: UpdateChannelSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, id),
      });

      if (!channel) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Channel not found' },
        });
      }

      // TODO: Check workspace admin access

      const [updated] = await db
        .update(channels)
        .set(request.body)
        .where(eq(channels.id, id))
        .returning();

      return { success: true, data: updated };
    }
  );

  // Delete channel
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['channels'],
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, id),
      });

      if (!channel) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Channel not found' },
        });
      }

      if (channel.isDefault === 1) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Cannot delete default channel' },
        });
      }

      await db.delete(channels).where(eq(channels.id, id));

      return { success: true };
    }
  );
}
