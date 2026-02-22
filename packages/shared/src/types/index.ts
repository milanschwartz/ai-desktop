// User types
export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  settings: UserSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  defaultViewMode: ViewMode;
  theme: 'light' | 'dark' | 'system';
  claimHighlightStyle: 'subtle' | 'prominent' | 'off';
}

// Agent types
export interface Agent {
  id: string;
  name: string;
  avatarUrl: string | null;
  systemPrompt: string;
  model: string;
  capabilities: AgentCapability[];
  createdBy: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AgentCapability = 'chat' | 'image_analysis' | 'web_search' | 'document_analysis';

// Workspace types
export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  defaultViewMode: ViewMode;
  settings: WorkspaceSettings;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ViewMode = 'structured' | 'creative';

export interface WorkspaceSettings {
  agentAutoParticipate: boolean;
  claimValidationRequired: boolean;
}

// Membership types
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: Date;
}

export interface WorkspaceAgent {
  workspaceId: string;
  agentId: string;
  role: 'member' | 'viewer';
  configOverrides: AgentConfigOverrides | null;
  addedAt: Date;
}

export interface AgentConfigOverrides {
  systemPromptAddition?: string;
  autoParticipateChannels?: string[];
}

// Channel types
export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: Date;
}

// Message types
export interface Message {
  id: string;
  channelId: string | null;
  canvasNodeId: string | null;
  authorType: 'user' | 'agent';
  authorId: string;
  content: string;
  parentId: string | null;
  metadata: MessageMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageMetadata {
  model?: string;
  tokens?: number;
  claimCount?: number;
}

// Attachment types
export interface Attachment {
  id: string;
  messageId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  thumbnailPath: string | null;
  createdAt: Date;
}

// Canvas types
export interface CanvasNode {
  id: string;
  workspaceId: string;
  parentNodeId: string | null;
  title: string;
  description: string | null;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  style: CanvasNodeStyle;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CanvasNodeStyle {
  color?: string;
  shape?: 'rectangle' | 'rounded' | 'circle';
}

export interface CanvasEdge {
  id: string;
  workspaceId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string | null;
  style: CanvasEdgeStyle;
  createdAt: Date;
}

export interface CanvasEdgeStyle {
  color?: string;
  style?: 'solid' | 'dashed' | 'dotted';
}

// Claim types
export type ClaimStatus = 'unvalidated' | 'approved' | 'denied' | 'needs_info';
export type ClaimType = 'factual' | 'comparative' | 'opinion' | 'inference';

export interface Claim {
  id: string;
  messageId: string;
  workspaceId: string;
  content: string;
  textStart: number;
  textEnd: number;
  claimType: ClaimType;
  status: ClaimStatus;
  confidence: number | null;
  denialReason: string | null;
  correction: string | null;
  validatedBy: string | null;
  validatedAt: Date | null;
  createdAt: Date;
}

export interface ClaimSource {
  id: string;
  claimId: string;
  sourceType:
    | 'citation'
    | 'workspace_document'
    | 'workspace_message'
    | 'web_search'
    | 'validated_fact';
  title: string;
  url: string | null;
  contentSnippet: string | null;
  referenceId: string | null;
  createdAt: Date;
}

// Knowledge base types
export interface ValidatedFact {
  id: string;
  workspaceId: string;
  claimId: string;
  content: string;
  category: string | null;
  isActive: boolean;
  revokedAt: Date | null;
  revokedReason: string | null;
  createdAt: Date;
}

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

// API Response types
export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
