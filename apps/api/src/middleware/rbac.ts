import { FastifyRequest } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { workspaceMembers, workspaces } from '../db/schema/index.js';
import { authenticate } from './auth.js';
import { ERROR_CODES, HTTP_STATUS } from '@ai-desktop/shared';
import type { WorkspaceRole } from '@ai-desktop/shared';

// Permission levels for roles
const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

// Return type for requireRole middleware
interface RequireRoleResult {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
}

// Request type with workspaceId param
type WorkspaceRequest = FastifyRequest<{ Params: { workspaceId: string } }>;

// Check if user has required role in workspace
export async function checkWorkspaceRole(
  userId: string,
  workspaceId: string,
  requiredRole: WorkspaceRole
): Promise<boolean> {
  const membership = await db.query.workspaceMembers.findFirst({
    where: and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
  });

  if (!membership) {
    return false;
  }

  const userLevel = ROLE_HIERARCHY[membership.role as WorkspaceRole];
  const requiredLevel = ROLE_HIERARCHY[requiredRole];

  return userLevel >= requiredLevel;
}

// Get user's role in workspace
export async function getWorkspaceRole(
  userId: string,
  workspaceId: string
): Promise<WorkspaceRole | null> {
  const membership = await db.query.workspaceMembers.findFirst({
    where: and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
  });

  return (membership?.role as WorkspaceRole) ?? null;
}

// Middleware: Require workspace membership
export async function requireWorkspaceMember(
  request: WorkspaceRequest
): Promise<RequireRoleResult> {
  const user = await authenticate(request);
  const { workspaceId } = request.params;

  const role = await getWorkspaceRole(user.id, workspaceId);

  if (!role) {
    throw {
      statusCode: HTTP_STATUS.FORBIDDEN,
      code: ERROR_CODES.WORKSPACE_ACCESS_DENIED,
      message: 'You do not have access to this workspace',
    };
  }

  return { userId: user.id, workspaceId, role };
}

// Middleware: Require specific role
export function requireRole(requiredRole: WorkspaceRole) {
  return async (request: WorkspaceRequest): Promise<RequireRoleResult> => {
    const user = await authenticate(request);
    const { workspaceId } = request.params;

    const role = await getWorkspaceRole(user.id, workspaceId);

    if (!role) {
      throw {
        statusCode: HTTP_STATUS.FORBIDDEN,
        code: ERROR_CODES.WORKSPACE_ACCESS_DENIED,
        message: 'You do not have access to this workspace',
      };
    }

    if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[requiredRole]) {
      throw {
        statusCode: HTTP_STATUS.FORBIDDEN,
        code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        message: `This action requires ${requiredRole} role or higher`,
      };
    }

    return { userId: user.id, workspaceId, role };
  };
}

// Middleware: Require workspace ownership
export const requireOwner = requireRole('owner');

// Middleware: Require admin or higher
export const requireAdmin = requireRole('admin');

// Middleware: Require member or higher
export const requireMember = requireRole('member');

// Verify workspace exists
export async function verifyWorkspaceExists(workspaceId: string): Promise<boolean> {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    columns: { id: true },
  });

  return !!workspace;
}
