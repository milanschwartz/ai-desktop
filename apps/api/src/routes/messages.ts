import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { messages, channels, attachments } from '../db/schema/index.js';
import { authenticate } from '../middleware/auth.js';
import { checkWorkspaceRole } from '../middleware/rbac.js';
import {
  CreateMessageSchema,
  UpdateMessageSchema,
  PaginationSchema,
  HTTP_STATUS,
  ERROR_CODES,
} from '@ai-desktop/shared';

export default async function messagesRoutes(fastify: FastifyInstance) {
  // List messages in channel
  fastify.get(
    '/channels/:channelId',
    {
      schema: {
        tags: ['messages'],
        params: z.object({ channelId: z.string().uuid() }),
        querystring: PaginationSchema,
      },
    },
    async (request, reply) => {
      const user = await authenticate(request);
      const { channelId } = request.params;
      const { page, pageSize } = request.query;

      // Get channel to check workspace access
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId),
      });

      if (!channel) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Channel not found' },
        });
      }

      // Verify user is a member of the workspace that owns this channel
      const hasAccess = await checkWorkspaceRole(user.id, channel.workspaceId, 'viewer');
      if (!hasAccess) {
        return reply.status(HTTP_STATUS.FORBIDDEN).send({
          success: false,
          error: {
            code: ERROR_CODES.WORKSPACE_ACCESS_DENIED,
            message: 'You do not have access to this workspace',
          },
        });
      }

      const channelMessages = await db.query.messages.findMany({
        where: eq(messages.channelId, channelId),
        orderBy: [desc(messages.createdAt)],
        limit: pageSize,
        offset: (page - 1) * pageSize,
        with: { attachments: true },
      });

      // Use COUNT query instead of fetching all rows
      const [{ count: total }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .where(eq(messages.channelId, channelId));

      return {
        success: true,
        data: {
          items: channelMessages.map((m) => ({
            id: m.id,
            authorType: m.authorType,
            authorId: m.authorId,
            content: m.content,
            parentId: m.parentId,
            attachments: m.attachments,
            createdAt: m.createdAt.toISOString(),
            updatedAt: m.updatedAt.toISOString(),
          })),
          total,
          page,
          pageSize,
          hasMore: channelMessages.length === pageSize,
        },
      };
    }
  );

  // Create message
  fastify.post(
    '/channels/:channelId',
    {
      schema: {
        tags: ['messages'],
        params: z.object({ channelId: z.string().uuid() }),
        body: CreateMessageSchema,
      },
    },
    async (request, reply) => {
      const user = await authenticate(request);
      const { channelId } = request.params;
      const { content, parentId, attachments: messageAttachments } = request.body;

      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId),
      });

      if (!channel) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Channel not found' },
        });
      }

      // Verify user has member role or higher (viewers cannot send messages)
      const hasAccess = await checkWorkspaceRole(user.id, channel.workspaceId, 'member');
      if (!hasAccess) {
        return reply.status(HTTP_STATUS.FORBIDDEN).send({
          success: false,
          error: {
            code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            message: 'You do not have permission to send messages',
          },
        });
      }

      const [message] = await db
        .insert(messages)
        .values({
          channelId,
          authorType: 'user',
          authorId: user.id,
          content,
          parentId,
        })
        .returning();

      // Create attachments if provided
      if (messageAttachments?.length) {
        await db.insert(attachments).values(
          messageAttachments.map((a) => ({
            messageId: message.id,
            fileName: a.fileName,
            fileType: a.fileType,
            fileSize: a.fileSize,
            storagePath: a.storagePath,
          }))
        );
      }

      return reply.status(HTTP_STATUS.CREATED).send({
        success: true,
        data: {
          id: message.id,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
        },
      });
    }
  );

  // Update message
  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['messages'],
        params: z.object({ id: z.string().uuid() }),
        body: UpdateMessageSchema,
      },
    },
    async (request, reply) => {
      const user = await authenticate(request);
      const { id } = request.params;
      const { content } = request.body;

      const message = await db.query.messages.findFirst({
        where: eq(messages.id, id),
      });

      if (!message) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Message not found' },
        });
      }

      // Only the author can edit their own messages
      if (message.authorType !== 'user' || message.authorId !== user.id) {
        return reply.status(HTTP_STATUS.FORBIDDEN).send({
          success: false,
          error: {
            code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            message: 'You can only edit your own messages',
          },
        });
      }

      const [updated] = await db
        .update(messages)
        .set({ content, updatedAt: new Date() })
        .where(eq(messages.id, id))
        .returning();

      return { success: true, data: updated };
    }
  );

  // Delete message
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['messages'],
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const user = await authenticate(request);
      const { id } = request.params;

      const message = await db.query.messages.findFirst({
        where: eq(messages.id, id),
        with: { channel: true },
      });

      if (!message) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Message not found' },
        });
      }

      // Author can delete their own messages; workspace admins can delete any message
      const isAuthor = message.authorType === 'user' && message.authorId === user.id;
      const isAdmin = message.channel
        ? await checkWorkspaceRole(user.id, message.channel.workspaceId, 'admin')
        : false;

      if (!isAuthor && !isAdmin) {
        return reply.status(HTTP_STATUS.FORBIDDEN).send({
          success: false,
          error: {
            code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            message: 'You do not have permission to delete this message',
          },
        });
      }

      await db.delete(messages).where(eq(messages.id, id));

      return { success: true };
    }
  );

  // Get thread replies
  fastify.get(
    '/:id/thread',
    {
      schema: {
        tags: ['messages'],
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request) => {
      await authenticate(request);
      const { id } = request.params;

      const replies = await db.query.messages.findMany({
        where: eq(messages.parentId, id),
        orderBy: [messages.createdAt],
      });

      return {
        success: true,
        data: replies.map((r) => ({
          id: r.id,
          authorType: r.authorType,
          authorId: r.authorId,
          content: r.content,
          createdAt: r.createdAt.toISOString(),
        })),
      };
    }
  );
}
