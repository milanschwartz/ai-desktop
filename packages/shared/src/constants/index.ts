// Auth constants
export const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const WEBSOCKET_TICKET_EXPIRY_MS = 30 * 1000; // 30 seconds

// Password constants
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const ARGON2_MEMORY_COST = 19456; // 19 MiB
export const ARGON2_TIME_COST = 2;
export const ARGON2_PARALLELISM = 1;

// Rate limits
export const RATE_LIMITS = {
  LOGIN: { max: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 min
  REGISTER: { max: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  MESSAGES: { max: 60, windowMs: 60 * 1000 }, // 60 per min
  AGENT_TEST: { max: 10, windowMs: 60 * 1000 }, // 10 per min
  FILE_UPLOAD: { max: 20, windowMs: 60 * 1000 }, // 20 per min
  GENERAL: { max: 200, windowMs: 60 * 1000 }, // 200 per min
} as const;

// File upload limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILE_SIZE_IMAGE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/json',
];

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

// Canvas defaults
export const CANVAS_NODE_DEFAULT_WIDTH = 200;
export const CANVAS_NODE_DEFAULT_HEIGHT = 150;
export const CANVAS_GRID_SIZE = 20;

// Claim validation
export const CLAIM_HOVER_DELAY_MS = 500; // Long hover delay for claim preview
export const ZEN_MODE_KEYBOARD_SHORTCUTS = {
  APPROVE: 'a',
  DENY: 'd',
  NEED_INFO: 'i',
  SKIP: 'ArrowRight',
  PREVIOUS: 'ArrowLeft',
  EXIT: 'Escape',
} as const;

// WebSocket event names
export const WS_EVENTS = {
  // Client -> Server
  JOIN_WORKSPACE: 'join_workspace',
  LEAVE_WORKSPACE: 'leave_workspace',
  SEND_MESSAGE: 'send_message',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  CANVAS_NODE_MOVE: 'canvas_node_move',
  CANVAS_NODE_UPDATE: 'canvas_node_update',

  // Server -> Client
  MESSAGE_CREATED: 'message_created',
  MESSAGE_UPDATED: 'message_updated',
  MESSAGE_DELETED: 'message_deleted',
  MEMBER_JOINED: 'member_joined',
  MEMBER_LEFT: 'member_left',
  AGENT_TYPING: 'agent_typing',
  AGENT_RESPONSE: 'agent_response',
  CANVAS_UPDATED: 'canvas_updated',
  PRESENCE_UPDATE: 'presence_update',
  CLAIM_VALIDATED: 'claim_validated',
  FACT_ADDED: 'fact_added',
  FACT_REVOKED: 'fact_revoked',
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Error codes
export const ERROR_CODES = {
  // Auth errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  REFRESH_TOKEN_REVOKED: 'REFRESH_TOKEN_REVOKED',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Authorization errors
  NOT_AUTHORIZED: 'NOT_AUTHORIZED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  WORKSPACE_ACCESS_DENIED: 'WORKSPACE_ACCESS_DENIED',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Agent errors
  AGENT_UNAVAILABLE: 'AGENT_UNAVAILABLE',
  OPENROUTER_ERROR: 'OPENROUTER_ERROR',

  // File errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',

  // Internal errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
