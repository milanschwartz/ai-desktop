import { db } from '../db/index.js';
import { auditLogs } from '../db/schema/index.js';

interface AuditLogParams {
  action: string;
  userId?: string;
  workspaceId?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function auditLog(params: AuditLogParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId ?? null,
      workspaceId: params.workspaceId ?? null,
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      metadata: params.metadata ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('Audit log failed:', error);
  }
}

// Common audit actions
export const AUDIT_ACTIONS = {
  // Auth
  USER_REGISTERED: 'user_registered',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  PASSKEY_REGISTERED: 'passkey_registered',

  // Workspace
  WORKSPACE_CREATED: 'workspace_created',
  WORKSPACE_DELETED: 'workspace_deleted',
  MEMBER_ADDED: 'member_added',
  MEMBER_REMOVED: 'member_removed',
  ROLE_CHANGED: 'role_changed',

  // Agent
  AGENT_CREATED: 'agent_created',
  AGENT_UPDATED: 'agent_updated',
  AGENT_DELETED: 'agent_deleted',
  AGENT_API_KEY_CHANGED: 'agent_api_key_changed',

  // Claims
  CLAIM_VALIDATED: 'claim_validated',
  CLAIM_DENIED: 'claim_denied',
  FACT_REVOKED: 'fact_revoked',
} as const;
