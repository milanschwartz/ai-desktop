import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  workspaces,
  workspaceMembers,
  workspaceAgents,
  agents,
  channels,
} from '../db/schema/index.js';
import { authenticate } from '../middleware/auth.js';
import { requireWorkspaceMember, requireAdmin, requireOwner } from '../middleware/rbac.js';
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  AddMemberSchema,
  UpdateMemberRoleSchema,
  AddAgentToWorkspaceSchema,
  HTTP_STATUS,
  ERROR_CODES,
} from '@ai-desktop/shared';
import { auditLog, AUDIT_ACTIONS } from '../services/audit.js';

export default async function workspacesRoutes(fastify: FastifyInstance) {
  // List user's workspaces
  fastify.get(
    '/',
    {
      schema: {
        tags: ['workspaces'],
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                description: z.string().nullable(),
                defaultViewMode: z.enum(['structured', 'creative']),
                role: z.enum(['owner', 'admin', 'member', 'viewer']),
                memberCount: z.number(),
                createdAt: z.string(),
              })
            ),
          }),
        },
      },
    },
    async (request) => {
      const user = await authenticate(request);

      const memberships = await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.userId, user.id),
        with: { workspace: true },
      });

      const workspacesWithCounts = await Promise.all(
        memberships.map(async (m) => {
          const members = await db.query.workspaceMembers.findMany({
            where: eq(workspaceMembers.workspaceId, m.workspaceId),
          });
          return {
            id: m.workspace.id,
            name: m.workspace.name,
            description: m.workspace.description,
            defaultViewMode: m.workspace.defaultViewMode as 'structured' | 'creative',
            role: m.role as 'owner' | 'admin' | 'member' | 'viewer',
            memberCount: members.length,
            createdAt: m.workspace.createdAt.toISOString(),
          };
        })
      );

      return { success: true, data: workspacesWithCounts };
    }
  );

  // Create workspace
  fastify.post(
    '/',
    {
      schema: {
        tags: ['workspaces'],
        body: CreateWorkspaceSchema,
        response: {
          201: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string(),
              name: z.string(),
              description: z.string().nullable(),
              defaultViewMode: z.enum(['structured', 'creative']),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const user = await authenticate(request);
      const { name, description, defaultViewMode } = request.body;

      const [workspace] = await db
        .insert(workspaces)
        .values({
          name,
          description,
          defaultViewMode: defaultViewMode ?? 'structured',
          createdBy: user.id,
        })
        .returning();

      // Add creator as owner
      await db.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: user.id,
        role: 'owner',
      });

      // Create default channel
      await db.insert(channels).values({
        workspaceId: workspace.id,
        name: 'general',
        description: 'General discussion',
        isDefault: 1,
      });

      await auditLog({
        action: AUDIT_ACTIONS.WORKSPACE_CREATED,
        userId: user.id,
        workspaceId: workspace.id,
        ipAddress: request.ip,
      });

      return reply.status(HTTP_STATUS.CREATED).send({
        success: true,
        data: {
          id: workspace.id,
          name: workspace.name,
          description: workspace.description,
          defaultViewMode: workspace.defaultViewMode as 'structured' | 'creative',
        },
      });
    }
  );

  // Get workspace by ID
  fastify.get(
    '/:workspaceId',
    {
      schema: {
        tags: ['workspaces'],
        params: z.object({ workspaceId: z.string().uuid() }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string(),
              name: z.string(),
              description: z.string().nullable(),
              defaultViewMode: z.enum(['structured', 'creative']),
              settings: z.object({
                agentAutoParticipate: z.boolean(),
                claimValidationRequired: z.boolean(),
              }),
              createdAt: z.string(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { workspaceId } = await requireWorkspaceMember(request);

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });

      if (!workspace) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Workspace not found' },
        });
      }

      return {
        success: true,
        data: {
          id: workspace.id,
          name: workspace.name,
          description: workspace.description,
          defaultViewMode: workspace.defaultViewMode as 'structured' | 'creative',
          settings: workspace.settings,
          createdAt: workspace.createdAt.toISOString(),
        },
      };
    }
  );

  // Update workspace
  fastify.patch(
    '/:workspaceId',
    {
      schema: {
        tags: ['workspaces'],
        params: z.object({ workspaceId: z.string().uuid() }),
        body: UpdateWorkspaceSchema,
      },
    },
    async (request, _reply) => {
      const { workspaceId } = await requireAdmin(request);

      const [updated] = await db
        .update(workspaces)
        .set({ ...request.body, updatedAt: new Date() })
        .where(eq(workspaces.id, workspaceId))
        .returning();

      return { success: true, data: updated };
    }
  );

  // Delete workspace
  fastify.delete(
    '/:workspaceId',
    {
      schema: {
        tags: ['workspaces'],
        params: z.object({ workspaceId: z.string().uuid() }),
      },
    },
    async (request, _reply) => {
      const { workspaceId, userId } = await requireOwner(request);

      await db.delete(workspaces).where(eq(workspaces.id, workspaceId));

      await auditLog({
        action: AUDIT_ACTIONS.WORKSPACE_DELETED,
        userId,
        workspaceId,
        ipAddress: request.ip,
      });

      return { success: true };
    }
  );

  // List members
  fastify.get(
    '/:workspaceId/members',
    {
      schema: {
        tags: ['workspaces'],
        params: z.object({ workspaceId: z.string().uuid() }),
      },
    },
    async (request) => {
      const { workspaceId } = await requireWorkspaceMember(request);

      const members = await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.workspaceId, workspaceId),
        with: { user: true },
      });

      return {
        success: true,
        data: members.map((m) => ({
          userId: m.userId,
          username: m.user.username,
          displayName: m.user.displayName,
          avatarUrl: m.user.avatarUrl,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
        })),
      };
    }
  );

  // Add member
  fastify.post(
    '/:workspaceId/members',
    {
      schema: {
        tags: ['workspaces'],
        params: z.object({ workspaceId: z.string().uuid() }),
        body: AddMemberSchema,
      },
    },
    async (request, reply) => {
      const { workspaceId, userId: actorId } = await requireAdmin(request);
      const { userId, role } = request.body;

      // Check if already a member
      const existing = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        ),
      });

      if (existing) {
        return reply.status(HTTP_STATUS.CONFLICT).send({
          success: false,
          error: { code: ERROR_CODES.ALREADY_EXISTS, message: 'User is already a member' },
        });
      }

      await db.insert(workspaceMembers).values({
        workspaceId,
        userId,
        role,
      });

      await auditLog({
        action: AUDIT_ACTIONS.MEMBER_ADDED,
        userId: actorId,
        workspaceId,
        targetType: 'user',
        targetId: userId,
        metadata: { role },
        ipAddress: request.ip,
      });

      return { success: true };
    }
  );

  // Update member role
  fastify.patch(
    '/:workspaceId/members/:userId',
    {
      schema: {
        tags: ['workspaces'],
        params: z.object({ workspaceId: z.string().uuid(), userId: z.string().uuid() }),
        body: UpdateMemberRoleSchema,
      },
    },
    async (request) => {
      const { workspaceId, userId: actorId } = await requireAdmin(request);
      const { userId } = request.params;
      const { role } = request.body;

      const [updated] = await db
        .update(workspaceMembers)
        .set({ role })
        .where(
          and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId))
        )
        .returning();

      await auditLog({
        action: AUDIT_ACTIONS.ROLE_CHANGED,
        userId: actorId,
        workspaceId,
        targetType: 'user',
        targetId: userId,
        metadata: { newRole: role },
        ipAddress: request.ip,
      });

      return { success: true, data: updated };
    }
  );

  // Remove member
  fastify.delete(
    '/:workspaceId/members/:userId',
    {
      schema: {
        tags: ['workspaces'],
        params: z.object({ workspaceId: z.string().uuid(), userId: z.string().uuid() }),
      },
    },
    async (request) => {
      const { workspaceId, userId: actorId } = await requireAdmin(request);
      const { userId } = request.params;

      await db
        .delete(workspaceMembers)
        .where(
          and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId))
        );

      await auditLog({
        action: AUDIT_ACTIONS.MEMBER_REMOVED,
        userId: actorId,
        workspaceId,
        targetType: 'user',
        targetId: userId,
        ipAddress: request.ip,
      });

      return { success: true };
    }
  );

  // List workspace agents
  fastify.get(
    '/:workspaceId/agents',
    {
      schema: {
        tags: ['workspaces'],
        params: z.object({ workspaceId: z.string().uuid() }),
      },
    },
    async (request) => {
      const { workspaceId } = await requireWorkspaceMember(request);

      const workspaceAgentsList = await db.query.workspaceAgents.findMany({
        where: eq(workspaceAgents.workspaceId, workspaceId),
        with: { agent: true },
      });

      return {
        success: true,
        data: workspaceAgentsList.map((wa) => ({
          agentId: wa.agentId,
          name: wa.agent.name,
          avatarUrl: wa.agent.avatarUrl,
          model: wa.agent.model,
          role: wa.role,
          configOverrides: wa.configOverrides,
          isActive: wa.agent.isActive,
        })),
      };
    }
  );

  // Add agent to workspace
  fastify.post(
    '/:workspaceId/agents',
    {
      schema: {
        tags: ['workspaces'],
        params: z.object({ workspaceId: z.string().uuid() }),
        body: AddAgentToWorkspaceSchema,
      },
    },
    async (request, reply) => {
      const { workspaceId } = await requireAdmin(request);
      const { agentId, role, configOverrides } = request.body;

      // Check if agent exists
      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, agentId),
      });

      if (!agent) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Agent not found' },
        });
      }

      // Check if already added
      const existing = await db.query.workspaceAgents.findFirst({
        where: and(
          eq(workspaceAgents.workspaceId, workspaceId),
          eq(workspaceAgents.agentId, agentId)
        ),
      });

      if (existing) {
        return reply.status(HTTP_STATUS.CONFLICT).send({
          success: false,
          error: { code: ERROR_CODES.ALREADY_EXISTS, message: 'Agent already in workspace' },
        });
      }

      await db.insert(workspaceAgents).values({
        workspaceId,
        agentId,
        role: role ?? 'member',
        configOverrides,
      });

      return { success: true };
    }
  );

  // Remove agent from workspace
  fastify.delete(
    '/:workspaceId/agents/:agentId',
    {
      schema: {
        tags: ['workspaces'],
        params: z.object({ workspaceId: z.string().uuid(), agentId: z.string().uuid() }),
      },
    },
    async (request) => {
      const { workspaceId } = await requireAdmin(request);
      const { agentId } = request.params;

      await db
        .delete(workspaceAgents)
        .where(
          and(eq(workspaceAgents.workspaceId, workspaceId), eq(workspaceAgents.agentId, agentId))
        );

      return { success: true };
    }
  );
}
