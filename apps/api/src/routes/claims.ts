import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { claims, claimSources, validatedFacts } from '../db/schema/index.js';
import { requireWorkspaceMember } from '../middleware/rbac.js';
import {
  UpdateClaimSchema,
  AddClaimSourceSchema,
  HTTP_STATUS,
  ERROR_CODES,
} from '@ai-desktop/shared';
import { auditLog, AUDIT_ACTIONS } from '../services/audit.js';

export default async function claimsRoutes(fastify: FastifyInstance) {
  // Get claims for a message
  fastify.get(
    '/messages/:messageId/claims',
    {
      schema: {
        tags: ['claims'],
        params: z.object({ messageId: z.string().uuid() }),
      },
    },
    async (request) => {
      const { messageId } = request.params;

      const messageClaims = await db.query.claims.findMany({
        where: eq(claims.messageId, messageId),
        with: { sources: true },
      });

      return { success: true, data: messageClaims };
    }
  );

  // List claims in workspace
  fastify.get(
    '/workspaces/:workspaceId/claims',
    {
      schema: {
        tags: ['claims'],
        params: z.object({ workspaceId: z.string().uuid() }),
        querystring: z.object({
          status: z.enum(['unvalidated', 'approved', 'denied', 'needs_info']).optional(),
        }),
      },
    },
    async (request) => {
      const { workspaceId } = await requireWorkspaceMember(request);

      const query = db.query.claims.findMany({
        where: eq(claims.workspaceId, workspaceId),
      });

      // TODO: Add status filter

      return { success: true, data: query };
    }
  );

  // Update claim status
  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['claims'],
        params: z.object({ id: z.string().uuid() }),
        body: UpdateClaimSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { status, denialReason, correction } = request.body;

      const claim = await db.query.claims.findFirst({
        where: eq(claims.id, id),
      });

      if (!claim) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Claim not found' },
        });
      }

      // TODO: Check workspace access

      const [updated] = await db
        .update(claims)
        .set({
          status,
          denialReason,
          correction,
          validatedBy: 'user-id-placeholder', // TODO: Get from auth
          validatedAt: new Date(),
        })
        .where(eq(claims.id, id))
        .returning();

      // If approved, add to knowledge base
      if (status === 'approved') {
        await db.insert(validatedFacts).values({
          workspaceId: claim.workspaceId,
          claimId: claim.id,
          content: claim.content,
          isActive: 1,
        });

        await auditLog({
          action: AUDIT_ACTIONS.CLAIM_VALIDATED,
          targetType: 'claim',
          targetId: id,
          workspaceId: claim.workspaceId,
        });
      }

      return { success: true, data: updated };
    }
  );

  // Add source to claim
  fastify.post(
    '/:id/sources',
    {
      schema: {
        tags: ['claims'],
        params: z.object({ id: z.string().uuid() }),
        body: AddClaimSourceSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { sourceType, title, url, contentSnippet, referenceId } = request.body;

      const claim = await db.query.claims.findFirst({
        where: eq(claims.id, id),
      });

      if (!claim) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Claim not found' },
        });
      }

      const [source] = await db
        .insert(claimSources)
        .values({
          claimId: id,
          sourceType,
          title,
          url,
          contentSnippet,
          referenceId,
        })
        .returning();

      return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: source });
    }
  );

  // Remove source from claim
  fastify.delete(
    '/:claimId/sources/:sourceId',
    {
      schema: {
        tags: ['claims'],
        params: z.object({ claimId: z.string().uuid(), sourceId: z.string().uuid() }),
      },
    },
    async (request) => {
      const { claimId, sourceId } = request.params;

      await db
        .delete(claimSources)
        .where(and(eq(claimSources.claimId, claimId), eq(claimSources.id, sourceId)));

      return { success: true };
    }
  );

  // Search for supporting info
  fastify.post(
    '/:id/search',
    {
      schema: {
        tags: ['claims'],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          query: z.string().optional(),
        }),
      },
    },
    async (request) => {
      const { id } = request.params;

      const claim = await db.query.claims.findFirst({
        where: eq(claims.id, id),
      });

      if (!claim) {
        return {
          success: true,
          data: { workspaceDocs: [], workspaceMessages: [], webResults: [] },
        };
      }

      // TODO: Search workspace documents
      // TODO: Search workspace messages
      // TODO: Web search (optional)

      return {
        success: true,
        data: {
          workspaceDocs: [],
          workspaceMessages: [],
          webResults: [],
        },
      };
    }
  );

  // Get pending claims for Zen Mode
  fastify.get(
    '/workspaces/:workspaceId/claims/pending',
    {
      schema: {
        tags: ['claims'],
        params: z.object({ workspaceId: z.string().uuid() }),
      },
    },
    async (request) => {
      const { workspaceId } = await requireWorkspaceMember(request);

      const pendingClaims = await db.query.claims.findMany({
        where: and(eq(claims.workspaceId, workspaceId), eq(claims.status, 'unvalidated')),
        with: { message: true },
      });

      return { success: true, data: pendingClaims };
    }
  );

  // Knowledge base endpoints
  fastify.get(
    '/workspaces/:workspaceId/facts',
    {
      schema: {
        tags: ['claims'],
        params: z.object({ workspaceId: z.string().uuid() }),
      },
    },
    async (request) => {
      const { workspaceId } = await requireWorkspaceMember(request);

      const facts = await db.query.validatedFacts.findMany({
        where: and(eq(validatedFacts.workspaceId, workspaceId), eq(validatedFacts.isActive, 1)),
      });

      return { success: true, data: facts };
    }
  );

  // Revoke fact
  fastify.delete(
    '/facts/:id',
    {
      schema: {
        tags: ['claims'],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ reason: z.string().optional() }),
      },
    },
    async (request) => {
      const { id } = request.params;
      const { reason } = request.body;

      const [revoked] = await db
        .update(validatedFacts)
        .set({
          isActive: 0,
          revokedAt: new Date(),
          revokedReason: reason,
        })
        .where(eq(validatedFacts.id, id))
        .returning();

      await auditLog({
        action: AUDIT_ACTIONS.FACT_REVOKED,
        targetType: 'validated_fact',
        targetId: id,
        workspaceId: revoked.workspaceId,
      });

      return { success: true };
    }
  );
}
