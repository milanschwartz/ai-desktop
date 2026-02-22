import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { authenticate } from '../middleware/auth.js';
import { UpdateUserSchema, UserSettingsSchema, HTTP_STATUS, ERROR_CODES } from '@ai-desktop/shared';

export default async function usersRoutes(fastify: FastifyInstance) {
  // Get all users (search)
  fastify.get(
    '/',
    {
      schema: {
        tags: ['users'],
        querystring: z.object({
          search: z.string().optional(),
          limit: z.coerce.number().int().positive().max(50).default(20),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(
              z.object({
                id: z.string(),
                username: z.string(),
                displayName: z.string(),
                avatarUrl: z.string().nullable(),
              })
            ),
          }),
        },
      },
    },
    async (request) => {
      await authenticate(request);
      const { limit } = request.query;

      const query = db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .limit(limit);

      // TODO: Add search filter when Drizzle supports ilike

      const results = await query;

      return { success: true, data: results };
    }
  );

  // Get user by ID
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['users'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string(),
              username: z.string(),
              displayName: z.string(),
              avatarUrl: z.string().nullable(),
              settings: z.object({
                defaultViewMode: z.enum(['structured', 'creative']),
                theme: z.enum(['light', 'dark', 'system']),
                claimHighlightStyle: z.enum(['subtle', 'prominent', 'off']),
              }),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      await authenticate(request);
      const { id } = request.params;

      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!user) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'User not found' },
        });
      }

      return {
        success: true,
        data: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          settings: user.settings,
        },
      };
    }
  );

  // Update user
  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['users'],
        params: z.object({ id: z.string().uuid() }),
        body: UpdateUserSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string(),
              username: z.string(),
              displayName: z.string(),
              avatarUrl: z.string().nullable(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const currentUser = await authenticate(request);
      const { id } = request.params;

      // Can only update own profile
      if (currentUser.id !== id) {
        return reply.status(HTTP_STATUS.FORBIDDEN).send({
          success: false,
          error: { code: ERROR_CODES.NOT_AUTHORIZED, message: 'Can only update own profile' },
        });
      }

      const [updated] = await db
        .update(users)
        .set({
          ...request.body,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      return {
        success: true,
        data: {
          id: updated.id,
          username: updated.username,
          displayName: updated.displayName,
          avatarUrl: updated.avatarUrl,
        },
      };
    }
  );

  // Update user settings
  fastify.patch(
    '/:id/settings',
    {
      schema: {
        tags: ['users'],
        params: z.object({ id: z.string().uuid() }),
        body: UserSettingsSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              defaultViewMode: z.enum(['structured', 'creative']),
              theme: z.enum(['light', 'dark', 'system']),
              claimHighlightStyle: z.enum(['subtle', 'prominent', 'off']),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const currentUser = await authenticate(request);
      const { id } = request.params;

      if (currentUser.id !== id) {
        return reply.status(HTTP_STATUS.FORBIDDEN).send({
          success: false,
          error: { code: ERROR_CODES.NOT_AUTHORIZED, message: 'Can only update own settings' },
        });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!user) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'User not found' },
        });
      }

      const newSettings = { ...user.settings, ...request.body };

      const [updated] = await db
        .update(users)
        .set({ settings: newSettings, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      return { success: true, data: updated.settings };
    }
  );
}
