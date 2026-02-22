import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { canvasNodes, canvasEdges } from '../db/schema/index.js';
import { requireWorkspaceMember, requireMember } from '../middleware/rbac.js';
import {
  CreateCanvasNodeSchema,
  UpdateCanvasNodeSchema,
  CreateCanvasEdgeSchema,
  HTTP_STATUS,
  ERROR_CODES,
} from '@ai-desktop/shared';

export default async function canvasRoutes(fastify: FastifyInstance) {
  // Get full canvas for workspace
  fastify.get(
    '/workspaces/:workspaceId/canvas',
    {
      schema: {
        tags: ['canvas'],
        params: z.object({ workspaceId: z.string().uuid() }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              nodes: z.array(
                z.object({
                  id: z.string(),
                  parentNodeId: z.string().nullable(),
                  title: z.string(),
                  description: z.string().nullable(),
                  positionX: z.number(),
                  positionY: z.number(),
                  width: z.number(),
                  height: z.number(),
                  style: z.object({
                    color: z.string().optional(),
                    shape: z.enum(['rectangle', 'rounded', 'circle']).optional(),
                  }),
                  createdAt: z.string(),
                })
              ),
              edges: z.array(
                z.object({
                  id: z.string(),
                  sourceNodeId: z.string(),
                  targetNodeId: z.string(),
                  label: z.string().nullable(),
                  style: z.object({
                    color: z.string().optional(),
                    style: z.enum(['solid', 'dashed', 'dotted']).optional(),
                  }),
                })
              ),
            }),
          }),
        },
      },
    },
    async (request) => {
      const { workspaceId } = await requireWorkspaceMember(request);

      const nodes = await db.query.canvasNodes.findMany({
        where: eq(canvasNodes.workspaceId, workspaceId),
      });

      const edges = await db.query.canvasEdges.findMany({
        where: eq(canvasEdges.workspaceId, workspaceId),
      });

      return {
        success: true,
        data: {
          nodes: nodes.map((n) => ({
            id: n.id,
            parentNodeId: n.parentNodeId,
            title: n.title,
            description: n.description,
            positionX: n.positionX,
            positionY: n.positionY,
            width: n.width,
            height: n.height,
            style: n.style as { color?: string; shape?: 'rectangle' | 'rounded' | 'circle' },
            createdAt: n.createdAt.toISOString(),
          })),
          edges: edges.map((e) => ({
            id: e.id,
            sourceNodeId: e.sourceNodeId,
            targetNodeId: e.targetNodeId,
            label: e.label,
            style: e.style as { color?: string; style?: 'solid' | 'dashed' | 'dotted' },
          })),
        },
      };
    }
  );

  // Create canvas node
  fastify.post(
    '/workspaces/:workspaceId/canvas/nodes',
    {
      schema: {
        tags: ['canvas'],
        params: z.object({ workspaceId: z.string().uuid() }),
        body: CreateCanvasNodeSchema,
      },
    },
    async (request, reply) => {
      const { workspaceId, userId } = await requireMember(request);
      const { title, description, parentNodeId, positionX, positionY, width, height, style } =
        request.body;

      const [node] = await db
        .insert(canvasNodes)
        .values({
          workspaceId,
          title,
          description,
          parentNodeId,
          positionX,
          positionY,
          width: width ?? 200,
          height: height ?? 150,
          style: style ?? {},
          createdBy: userId,
        })
        .returning();

      return reply.status(HTTP_STATUS.CREATED).send({
        success: true,
        data: {
          id: node.id,
          title: node.title,
          positionX: node.positionX,
          positionY: node.positionY,
        },
      });
    }
  );

  // Update canvas node
  fastify.patch(
    '/nodes/:id',
    {
      schema: {
        tags: ['canvas'],
        params: z.object({ id: z.string().uuid() }),
        body: UpdateCanvasNodeSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const node = await db.query.canvasNodes.findFirst({
        where: eq(canvasNodes.id, id),
      });

      if (!node) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Node not found' },
        });
      }

      // TODO: Check workspace access

      const [updated] = await db
        .update(canvasNodes)
        .set({ ...request.body, updatedAt: new Date() })
        .where(eq(canvasNodes.id, id))
        .returning();

      return { success: true, data: updated };
    }
  );

  // Delete canvas node
  fastify.delete(
    '/nodes/:id',
    {
      schema: {
        tags: ['canvas'],
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, _reply) => {
      const { id } = request.params;

      await db.delete(canvasNodes).where(eq(canvasNodes.id, id));

      return { success: true };
    }
  );

  // Create canvas edge
  fastify.post(
    '/workspaces/:workspaceId/canvas/edges',
    {
      schema: {
        tags: ['canvas'],
        params: z.object({ workspaceId: z.string().uuid() }),
        body: CreateCanvasEdgeSchema,
      },
    },
    async (request, reply) => {
      const { workspaceId } = await requireMember(request);
      const { sourceNodeId, targetNodeId, label, style } = request.body;

      const [edge] = await db
        .insert(canvasEdges)
        .values({
          workspaceId,
          sourceNodeId,
          targetNodeId,
          label,
          style: style ?? {},
        })
        .returning();

      return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: edge });
    }
  );

  // Delete canvas edge
  fastify.delete(
    '/edges/:id',
    {
      schema: {
        tags: ['canvas'],
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request) => {
      const { id } = request.params;

      await db.delete(canvasEdges).where(eq(canvasEdges.id, id));

      return { success: true };
    }
  );

  // Get messages for canvas node
  fastify.get(
    '/nodes/:nodeId/messages',
    {
      schema: {
        tags: ['canvas'],
        params: z.object({ nodeId: z.string().uuid() }),
      },
    },
    async (request) => {
      const { nodeId } = request.params;

      const nodeMessages = await db.query.messages.findMany({
        where: eq('messages.canvasNodeId', nodeId),
        orderBy: ['messages.createdAt'],
      });

      return { success: true, data: nodeMessages };
    }
  );
}
