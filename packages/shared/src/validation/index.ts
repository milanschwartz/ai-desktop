import { z } from 'zod';

// Enums
export const WorkspaceRoleSchema = z.enum(['owner', 'admin', 'member', 'viewer']);
export const ViewModeSchema = z.enum(['structured', 'creative']);
export const ClaimStatusSchema = z.enum(['unvalidated', 'approved', 'denied', 'needs_info']);
export const ClaimTypeSchema = z.enum(['factual', 'comparative', 'opinion', 'inference']);
export const SourceTypeSchema = z.enum([
  'citation',
  'workspace_document',
  'workspace_message',
  'web_search',
  'validated_fact',
]);

// Auth schemas
export const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be at most 100 characters'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must be at most 128 characters'),
});

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// User schemas
export const UpdateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const UserSettingsSchema = z.object({
  defaultViewMode: ViewModeSchema.optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  claimHighlightStyle: z.enum(['subtle', 'prominent', 'off']).optional(),
});

// Workspace schemas
export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
  description: z.string().max(2000).nullable().optional(),
  defaultViewMode: ViewModeSchema.optional(),
});

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  defaultViewMode: ViewModeSchema.optional(),
});

export const AddMemberSchema = z.object({
  userId: z.string().uuid(),
  role: WorkspaceRoleSchema,
});

export const UpdateMemberRoleSchema = z.object({
  role: WorkspaceRoleSchema,
});

// Agent schemas
export const CreateAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  avatarUrl: z.string().url().nullable().optional(),
  systemPrompt: z.string().max(10000),
  model: z.string().min(1, 'Model is required'),
  capabilities: z.array(z.string()).optional(),
  openrouterApiKey: z.string().min(1, 'OpenRouter API key is required'),
});

export const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  systemPrompt: z.string().max(10000).optional(),
  model: z.string().min(1).optional(),
  capabilities: z.array(z.string()).optional(),
  openrouterApiKey: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const AddAgentToWorkspaceSchema = z.object({
  agentId: z.string().uuid(),
  role: z.enum(['member', 'viewer']).optional(),
  configOverrides: z
    .object({
      systemPromptAddition: z.string().max(5000).optional(),
      autoParticipateChannels: z.array(z.string().uuid()).optional(),
    })
    .optional(),
});

// Channel schemas
export const CreateChannelSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Channel name can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(500).nullable().optional(),
});

export const UpdateChannelSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().max(500).nullable().optional(),
});

// Message schemas
export const CreateMessageSchema = z.object({
  content: z.string().min(1, 'Content is required').max(50000),
  parentId: z.string().uuid().nullable().optional(),
  attachments: z
    .array(
      z.object({
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number().positive(),
        storagePath: z.string(),
      })
    )
    .optional(),
});

export const UpdateMessageSchema = z.object({
  content: z.string().min(1).max(50000),
});

// Canvas schemas
export const CreateCanvasNodeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).nullable().optional(),
  parentNodeId: z.string().uuid().nullable().optional(),
  positionX: z.number(),
  positionY: z.number(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  style: z
    .object({
      color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional(),
      shape: z.enum(['rectangle', 'rounded', 'circle']).optional(),
    })
    .optional(),
});

export const UpdateCanvasNodeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  style: z
    .object({
      color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional(),
      shape: z.enum(['rectangle', 'rounded', 'circle']).optional(),
    })
    .optional(),
});

export const CreateCanvasEdgeSchema = z.object({
  sourceNodeId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
  label: z.string().max(100).nullable().optional(),
  style: z
    .object({
      color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional(),
      style: z.enum(['solid', 'dashed', 'dotted']).optional(),
    })
    .optional(),
});

// Claim schemas
export const UpdateClaimSchema = z.object({
  status: ClaimStatusSchema,
  denialReason: z.string().max(1000).nullable().optional(),
  correction: z.string().max(2000).nullable().optional(),
});

export const AddClaimSourceSchema = z.object({
  sourceType: SourceTypeSchema,
  title: z.string().min(1).max(255),
  url: z.string().url().nullable().optional(),
  contentSnippet: z.string().max(5000).nullable().optional(),
  referenceId: z.string().uuid().nullable().optional(),
});

// Pagination schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

// File upload schema
export const FileUploadSchema = z.object({
  fileName: z.string().max(255),
  fileType: z.string().max(100),
  fileSize: z
    .number()
    .positive()
    .max(10 * 1024 * 1024), // 10MB max
});
