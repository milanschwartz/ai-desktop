# Security Model

**Date:** 2026-02-22  
**Status:** Draft  
**Related ADR:** ADR-007

---

## 1. Principles

1. **Zero trust between workspaces** — No data leaks across workspace boundaries, ever.
2. **Encrypt everything** — Data encrypted in transit (TLS) and at rest (AES-256).
3. **Least privilege** — Every request is scoped to the user's role in the specific workspace.
4. **Agents are sandboxed** — Same agent definition, different instance per workspace. No cross-workspace context.
5. **Passkeys preferred** — Support WebAuthn/passkeys as the primary auth method; username/password as fallback.
6. **Defense in depth** — Multiple layers: auth, RBAC, input validation, rate limiting, audit logging.

---

## 2. Authentication

### 2.1 Passkeys (Primary — WebAuthn)

Passkeys are the **preferred** authentication method. They are phishing-resistant, passwordless, and supported by all modern browsers and devices.

**Flow:**

```
Registration:
  1. User enters username + display name
  2. Browser prompts for passkey creation (biometric / security key / device PIN)
  3. Public key stored in DB, private key stays on device
  4. User is authenticated immediately

Login:
  1. User enters username (or selects from passkey autofill)
  2. Browser prompts for passkey verification
  3. Server validates the assertion
  4. JWT pair issued (access + refresh)
```

**Libraries:**

- Backend: `@simplewebauthn/server`
- Frontend: `@simplewebauthn/browser`

### 2.2 Username/Password (Fallback)

For environments where passkeys aren't available.

| Aspect                 | Implementation                                                           |
| ---------------------- | ------------------------------------------------------------------------ |
| Hashing                | Argon2id (preferred over bcrypt — memory-hard, resistant to GPU attacks) |
| Min password length    | 12 characters                                                            |
| Password rules         | Check against breached password list (HaveIBeenPwned k-anonymity API)    |
| Brute force protection | Exponential backoff + account lockout after 10 failed attempts           |

### 2.3 Token Strategy

| Token              | Lifetime   | Storage                                  | Purpose            |
| ------------------ | ---------- | ---------------------------------------- | ------------------ |
| Access token (JWT) | 15 minutes | Memory only (never localStorage)         | API authentication |
| Refresh token      | 7 days     | HttpOnly, Secure, SameSite=Strict cookie | Token renewal      |
| WebSocket ticket   | 30 seconds | One-time use                             | WS connection auth |

**Access token payload:**

```json
{
  "sub": "user-uuid",
  "username": "milan",
  "iat": 1740000000,
  "exp": 1740000900
}
```

**Important:** Access tokens do NOT contain workspace roles. Roles are checked server-side on every request to prevent stale permissions.

### 2.4 Session Management

- Refresh tokens are stored in DB (hashed) — can be revoked server-side
- Each device gets its own refresh token
- "Sign out everywhere" revokes all refresh tokens
- Refresh token rotation: each use issues a new refresh token and invalidates the old one

---

## 3. Authorization (RBAC)

### 3.1 Workspace-Scoped Permissions

Every API request that touches workspace data is checked against the user's role **in that specific workspace**.

```
Request: GET /api/v1/workspaces/:workspaceId/channels

Middleware chain:
  1. authenticate(req)        → Verify JWT, extract user ID
  2. authorizeWorkspace(req)  → Check user is a member of this workspace
  3. checkPermission(req)     → Verify role has permission for this action
  4. handler(req)             → Execute business logic
```

### 3.2 Permission Matrix

| Action                 | Owner | Admin | Member | Viewer |
| ---------------------- | :---: | :---: | :----: | :----: |
| View workspace content |  ✅   |  ✅   |   ✅   |   ✅   |
| Send messages          |  ✅   |  ✅   |   ✅   |   ❌   |
| Upload files           |  ✅   |  ✅   |   ✅   |   ❌   |
| Create channels        |  ✅   |  ✅   |   ❌   |   ❌   |
| Manage canvas nodes    |  ✅   |  ✅   |   ✅   |   ❌   |
| Add/remove members     |  ✅   |  ✅   |   ❌   |   ❌   |
| Add/remove agents      |  ✅   |  ✅   |   ❌   |   ❌   |
| Configure agents       |  ✅   |  ✅   |   ❌   |   ❌   |
| Validate claims        |  ✅   |  ✅   |   ✅   |   ❌   |
| Manage knowledge base  |  ✅   |  ✅   |   ✅   |   ❌   |
| Change member roles    |  ✅   |  ✅   |   ❌   |   ❌   |
| Delete workspace       |  ✅   |  ❌   |   ❌   |   ❌   |
| Workspace settings     |  ✅   |  ✅   |   ❌   |   ❌   |

### 3.3 Enforcement Layers

Permissions are enforced at **three layers**:

1. **API middleware** — Every route checks workspace membership + role
2. **Database queries** — All queries are scoped with `WHERE workspace_id = ?` — never fetch without workspace context
3. **WebSocket events** — Only broadcast to users who are members of the relevant workspace

```typescript
// NEVER do this:
const messages = await db.select().from(messages);

// ALWAYS do this:
const messages = await db
  .select()
  .from(messages)
  .where(eq(messages.workspaceId, authorizedWorkspaceId));
```

---

## 4. Workspace Isolation

### 4.1 Data Isolation

Every piece of data belongs to exactly one workspace. There is **no shared data** between workspaces.

| Data           | Isolation                                    |
| -------------- | -------------------------------------------- |
| Messages       | Scoped to workspace → channel                |
| Files          | Scoped to workspace (separate storage paths) |
| Canvas nodes   | Scoped to workspace                          |
| Claims & facts | Scoped to workspace knowledge base           |
| Channels       | Scoped to workspace                          |

### 4.2 Agent Isolation

Even if the same agent **definition** is used in multiple workspaces, each workspace gets an **independent instance**:

```
Agent "ResearchBot" (definition)
├── Workspace A instance
│   ├── Context: only Workspace A messages
│   ├── Knowledge base: only Workspace A facts
│   └── Files: only Workspace A files
└── Workspace B instance
    ├── Context: only Workspace B messages
    ├── Knowledge base: only Workspace B facts
    └── Files: only Workspace B files
```

**Implementation:**

- The `workspace_agents` table stores per-workspace config overrides
- When building agent context for an OpenRouter call, **only** messages/facts/files from the current workspace are included
- Agent system prompts can be customized per workspace
- The agent's conversation history is workspace-scoped

### 4.3 User Cross-Workspace Access

Users can be members of multiple workspaces. The UI provides a **workspace selector** to switch between them.

**Rules:**

- A user can only see workspaces they are a member of
- Switching workspaces completely changes the context (channels, messages, canvas, files, agents)
- No cross-workspace search (v1) — search is always scoped to current workspace
- User settings (theme, preferences) are global; workspace-specific settings are separate

---

## 5. Encryption

### 5.1 In Transit

| Channel          | Encryption                        |
| ---------------- | --------------------------------- |
| HTTP API         | TLS 1.3 (HTTPS only, HSTS header) |
| WebSocket        | WSS (TLS-encrypted WebSocket)     |
| OpenRouter calls | HTTPS (TLS 1.2+)                  |

**Configuration:**

- Minimum TLS 1.2, prefer TLS 1.3
- Strong cipher suites only (AEAD ciphers)
- HSTS with `max-age=31536000; includeSubDomains; preload`
- Certificate pinning for OpenRouter API (optional)

### 5.2 At Rest

| Data              | Encryption                   | Method                                                |
| ----------------- | ---------------------------- | ----------------------------------------------------- |
| Database          | Full-disk encryption         | OS-level or cloud provider (e.g., AWS RDS encryption) |
| Sensitive columns | Application-level encryption | AES-256-GCM via `node:crypto`                         |
| Files on disk     | Encrypted storage            | AES-256-GCM per file                                  |
| Backups           | Encrypted                    | Same as source                                        |

**Application-level encrypted fields:**

- `agents.openrouter_api_key` — encrypted with workspace-scoped key
- `users.password_hash` — Argon2id (not reversible encryption, but hashed)
- Refresh tokens — stored as SHA-256 hashes

**Key management:**

```
Master key (from environment variable / secret manager)
├── Derive workspace encryption key (HKDF)
│   ├── Encrypt agent API keys
│   └── Encrypt workspace files
└── Derive token signing key (HKDF)
    ├── Sign access tokens (JWT)
    └── Hash refresh tokens
```

**Libraries:**

- `node:crypto` — built-in Node.js crypto (AES-256-GCM, HKDF, SHA-256)
- No third-party crypto libraries needed — Node.js crypto is audited and maintained

### 5.3 Encryption Helper Pattern

```typescript
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

// Encrypt sensitive data
function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

// Decrypt sensitive data
function decrypt(ciphertext: string, key: Buffer): string {
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}
```

---

## 6. Input Validation & Sanitization

| Layer        | Tool                          | Purpose                                            |
| ------------ | ----------------------------- | -------------------------------------------------- |
| API input    | Zod schemas                   | Validate all request bodies, params, query strings |
| SQL          | Drizzle ORM (parameterized)   | Prevent SQL injection                              |
| HTML output  | DOMPurify (frontend)          | Prevent XSS in rendered markdown                   |
| File uploads | MIME type + magic bytes check | Prevent malicious file uploads                     |
| File names   | Sanitize path components      | Prevent path traversal                             |

**Every API endpoint** has a Zod schema. No unvalidated input reaches business logic.

---

## 7. Rate Limiting

| Endpoint               | Limit        | Window     |
| ---------------------- | ------------ | ---------- |
| `POST /auth/login`     | 5 attempts   | 15 minutes |
| `POST /auth/register`  | 3 accounts   | 1 hour     |
| `POST /*/messages`     | 60 messages  | 1 minute   |
| `POST /agents/*/test`  | 10 calls     | 1 minute   |
| Agent OpenRouter calls | 30 calls     | 1 minute   |
| File uploads           | 20 files     | 1 minute   |
| General API            | 200 requests | 1 minute   |

**Implementation:** Use `@fastify/rate-limit` with Redis backend (or in-memory for v1).

---

## 8. Audit Logging

Security-relevant actions are logged for accountability:

| Event                     | Logged Data                                    |
| ------------------------- | ---------------------------------------------- |
| Login success/failure     | User, IP, timestamp, method (passkey/password) |
| Password change           | User, timestamp                                |
| Workspace created/deleted | User, workspace, timestamp                     |
| Member added/removed      | Actor, target user, workspace, role            |
| Agent API key changed     | User, agent, workspace, timestamp              |
| Role changed              | Actor, target, old role, new role              |
| Claim validated           | User, claim, decision, workspace               |

Logs are stored in a separate `audit_logs` table, append-only.

---

## 9. Additional Security Headers

```typescript
// Fastify security headers plugin
{
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0', // Rely on CSP instead
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' wss: https://openrouter.ai",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}
```

---

## 10. Data Model Additions

### `passkey_credentials`

| Column       | Type         | Description                                    |
| ------------ | ------------ | ---------------------------------------------- |
| id           | VARCHAR(255) | Credential ID (from WebAuthn)                  |
| user_id      | UUID → users |                                                |
| public_key   | BYTEA        | Public key                                     |
| counter      | BIGINT       | Signature counter (replay protection)          |
| device_type  | VARCHAR(50)  | 'singleDevice' or 'multiDevice'                |
| backed_up    | BOOLEAN      | Whether credential is backed up                |
| transports   | JSONB        | Supported transports (usb, ble, nfc, internal) |
| created_at   | TIMESTAMP    |                                                |
| last_used_at | TIMESTAMP    |                                                |

### `refresh_tokens`

| Column      | Type         | Description              |
| ----------- | ------------ | ------------------------ |
| id          | UUID         | Primary key              |
| user_id     | UUID → users |                          |
| token_hash  | VARCHAR(64)  | SHA-256 hash of token    |
| device_info | VARCHAR(255) | User agent / device name |
| expires_at  | TIMESTAMP    |                          |
| created_at  | TIMESTAMP    |                          |
| revoked_at  | TIMESTAMP    | NULL if active           |

### `audit_logs`

| Column       | Type              | Description                        |
| ------------ | ----------------- | ---------------------------------- |
| id           | UUID              | Primary key                        |
| user_id      | UUID → users      | Actor (NULL for system events)     |
| workspace_id | UUID → workspaces | NULL for global events             |
| action       | VARCHAR(100)      | Event type                         |
| target_type  | VARCHAR(50)       | 'user', 'agent', 'workspace', etc. |
| target_id    | UUID              | ID of affected entity              |
| metadata     | JSONB             | Additional context                 |
| ip_address   | INET              | Client IP                          |
| created_at   | TIMESTAMP         |                                    |

---

## 11. Workspace Selector UI

The workspace selector is always visible in the top navigation bar, allowing users to switch between their workspaces.

```
┌─────────────────────────────────────────────────────────┐
│  ◉ AI Desktop    [▾ Project Alpha    ]    👤 Milan  ⚙️  │
│                   ┌──────────────────┐                  │
│                   │ ✦ Project Alpha  │ ← current        │
│                   │   Research Lab   │                   │
│                   │   Design Sprint  │                   │
│                   │ ─────────────── │                   │
│                   │ + New Workspace  │                   │
│                   └──────────────────┘                  │
├─────────────────────────────────────────────────────────┤
```

**Behavior:**

- Dropdown shows only workspaces the user is a member of
- Current workspace is highlighted
- Switching workspaces reloads all context (channels, messages, canvas, agents, files)
- Badge shows unread message count per workspace
- Keyboard shortcut to open selector (e.g., `Ctrl+K` then type workspace name)
