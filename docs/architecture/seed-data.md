# Seed Data System

**Date:** 2026-02-22  
**Status:** Draft  
**Related ADR:** ADR-010

---

## 1. Overview

The seed data system provides a **one-command way** to populate the database with realistic test data for development and testing. It creates a complete environment with users, agents, workspaces, channels, messages, files, canvas nodes, and claims.

---

## 2. Commands

| Command           | Description                                 |
| ----------------- | ------------------------------------------- |
| `pnpm seed`       | Populate database with seed data (additive) |
| `pnpm db:reset`   | Drop all data, re-run migrations, re-seed   |
| `pnpm db:migrate` | Run pending migrations only                 |

**Environment guard:** Seed commands refuse to run if `NODE_ENV=production`.

---

## 3. Seed Data Contents (Current Implementation)

> **Note:** The current seed (`apps/api/src/db/seed.ts`) creates a minimal demo environment.
> A richer multi-user, multi-workspace dataset is planned for future iterations.

### 3.1 Users

| Username | Password         | Role                      | Description       |
| -------- | ---------------- | ------------------------- | ----------------- |
| `demo`   | `demopass12345!` | Owner of "Demo Workspace" | Primary test user |

### 3.2 Agents

| Name    | Model                         | System Prompt Summary                      | Created By |
| ------- | ----------------------------- | ------------------------------------------ | ---------- |
| `Atlas` | `anthropic/claude-3.5-sonnet` | Helpful AI assistant, concise but thorough | demo       |

**Note:** No API key is set by default — users must configure their own OpenRouter API key.

### 3.3 Workspaces

```
Demo Workspace (Owner: demo)
├── Members: demo (owner)
├── Agents: Atlas (member)
├── Channels:
│   └── #general (default) — 3 messages (welcome + sample conversation)
├── Canvas:
│   ├── "Project Alpha" (root node)
│   ├── "Tasks" (root node)
│   └── "Notes" (root node)
├── Claims: 1 claim (unvalidated)
└── Knowledge Base: 1 validated fact
```

### 3.4 Planned Expansion

The following richer dataset is planned for a future iteration:

- **5 users** (milan, alex, jordan, sam, taylor) with different roles
- **4 agents** (ResearchBot, WriterBot, CodeBot, CriticBot) across models
- **2 workspaces** ("Project Alpha" and "Research Lab") with cross-membership
- **Realistic chat history** with claim annotations
- **15+ claims** across validation states (approved, denied, needs_info, unvalidated)
- **Deterministic UUIDs** for test referencing
- **Passkey credentials** for WebAuthn flow testing
- **Mock OpenRouter server** for deterministic agent responses

---

## 4. Implementation

### 4.1 File Structure (Current)

```
apps/api/
├── src/
│   └── db/
│       ├── seed.ts              # Single-file seed runner
│       ├── migrate.ts           # Migration runner
│       ├── reset.ts             # Drop + re-migrate + re-seed
│       └── schema/              # Drizzle schema definitions
```

> **Planned:** Split into modular seed files (`seed/users.seed.ts`, etc.) with
> deterministic IDs and test helpers when the dataset grows.

### 4.2 Test Helpers (Planned)

For unit/integration tests, provide helpers to create isolated test data:

```typescript
// Planned: apps/api/src/db/seed/test-helpers.ts
import { createTestUser, createTestWorkspace, createTestAgent } from '@/db/seed/test-helpers';

describe('workspace isolation', () => {
  it('should not allow cross-workspace access', async () => {
    const user = await createTestUser();
    const workspace1 = await createTestWorkspace({ owner: user });
    const workspace2 = await createTestWorkspace(); // different owner

    const res = await api
      .get(`/workspaces/${workspace2.id}/channels`)
      .set('Authorization', `Bearer ${user.token}`);

    expect(res.status).toBe(403);
  });
});
```

---

## 5. Environment Gating

```typescript
function assertNotProduction() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '🚨 Seed/reset commands cannot run in production! ' +
        'Set NODE_ENV to "development" or "test".'
    );
  }
}
```

The seed system checks `NODE_ENV` before any destructive operation. The `db:reset` command additionally requires a `--confirm` flag.
