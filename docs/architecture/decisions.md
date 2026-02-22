# Architecture Decision Records (ADRs)

This document tracks key architecture decisions for the AI Desktop project.

---

## ADR-001: Tech Stack Selection

**Status:** Accepted  
**Date:** 2026-02-22

**Context:** We need to choose the frontend framework, backend runtime, database, and real-time communication layer for a collaborative web app with complex UI (spatial canvas + structured views).

**Options considered:**

- Frontend: React/Next.js, Svelte/SvelteKit, Vue/Nuxt
- Backend: Node.js (Fastify/Express), Python (FastAPI), Go
- Database: PostgreSQL, SQLite, MongoDB
- Real-time: WebSockets, Server-Sent Events, CRDTs

**Decision:**

| Layer      | Choice                            | Rationale                                                    |
| ---------- | --------------------------------- | ------------------------------------------------------------ |
| Frontend   | React 19 + TypeScript + Vite      | Mature ecosystem, best for complex UIs, huge library support |
| Styling    | Tailwind CSS                      | Rapid prototyping, consistent design system                  |
| Canvas     | React Flow (or custom Canvas API) | Proven node-based spatial UI library                         |
| State      | Zustand                           | Lightweight, TypeScript-friendly, minimal boilerplate        |
| Backend    | Node.js + Fastify                 | Fast, TypeScript-native, great plugin system                 |
| ORM        | Drizzle ORM                       | Type-safe, lightweight, SQL-first                            |
| Database   | PostgreSQL 16                     | Robust, JSONB support, full-text search                      |
| Real-time  | WebSocket (ws / Socket.io)        | Bi-directional real-time messaging                           |
| Auth       | JWT (access + refresh tokens)     | Stateless, API-friendly                                      |
| AI Gateway | OpenRouter API                    | Multi-model access via single API                            |
| Monorepo   | pnpm workspaces + Turborepo       | Shared types between frontend/backend                        |

---

## ADR-002: V1 Scope — MVP Definition

**Status:** Accepted  
**Date:** 2026-02-22

**Context:** We need to define the minimum viable feature set for the first working version. The goal is the smallest useful product that demonstrates the core value proposition.

**Decision:** The MVP includes:

- **User auth** — username/password with JWT
- **Agent management** — create/configure agents via OpenRouter
- **Workspaces** — create, manage, assign users + agents
- **Channels** — organized conversations within workspaces
- **Real-time chat** — messages with markdown, threading, @mentions
- **Image sharing** — upload and discuss images
- **Two view modes** — Structured (linear) and Creative (spatial canvas)
- **Creative canvas** — infinite canvas with topic nodes, branching, discussions
- **API-first** — every feature available as REST API + WebSocket events

**Explicitly excluded from v1:** video/audio, OAuth/SSO, file manager, code editor, terminal, agent-to-agent autonomy, plugins, desktop metaphor (taskbar/windows).

---

## ADR-003: API-First Architecture

**Status:** Accepted  
**Date:** 2026-02-22

**Context:** We want agents and humans to have equal access to all features. The UI should not be the only way to interact with the system.

**Decision:** Every feature is implemented as an API endpoint first. The web frontend is a consumer of the API, not a special case. Agents interact through the same REST + WebSocket APIs. This ensures:

1. Agents can do anything a human can do programmatically
2. Third-party integrations are possible from day one
3. The frontend can be replaced or supplemented without backend changes
4. Testing is straightforward (API tests cover all functionality)

---

## ADR-004: Dual View Mode Architecture

**Status:** Accepted  
**Date:** 2026-02-22

**Context:** Users need both linear/structured thinking (lists, chats) and spatial/creative thinking (canvas, branching topics). These are fundamentally different interaction paradigms.

**Decision:** Both view modes share the same underlying data model. Messages, topics, and content exist independently of the view. The view mode is a _lens_ on the same data:

- **Structured mode**: channels → messages (chronological, threaded)
- **Creative mode**: canvas nodes → messages (spatial, branching)

A message can belong to both a channel and a canvas node. Switching modes doesn't lose any data — it reframes it.

---

## ADR-005: OpenRouter for AI Integration

**Status:** Accepted  
**Date:** 2026-02-22

**Context:** We need to support multiple LLM providers (OpenAI, Anthropic, Meta, etc.) without building separate integrations for each.

**Decision:** Use OpenRouter as the single AI gateway. Users provide their own OpenRouter API key. Benefits:

1. Access to 100+ models through one API
2. No vendor lock-in
3. Users control their own costs
4. Consistent API regardless of underlying model
5. Supports vision models for image analysis

---

## ADR-006: Claim Validation & Trust System

**Status:** Accepted  
**Date:** 2026-02-22

**Context:** AI agents mix facts, inferences, and hallucinations. Users need ergonomic ways to verify agent output, build a trusted knowledge base, and avoid re-validating known facts. This is the core differentiator of AI Desktop.

**Decision:** Implement a multi-layered claim validation system:

1. **Claim extraction** — Agent responses are parsed into discrete, verifiable claims (via agent self-annotation + fallback post-processing)
2. **Inline indicators** — Claims are subtly highlighted in messages; long-hover shows source preview + validation buttons
3. **Zen Mode** — Distraction-free, keyboard-driven sequential validation (Approve/Deny/Need More Info)
4. **Knowledge base** — Approved claims become validated facts, reused as trusted context in future agent prompts
5. **"Need More Info" search** — Searches workspace documents, chat history, and web for supporting evidence
6. **Preference learning** — System learns user validation patterns over time

This creates a feedback loop: validate → remember → inject into agents → less hallucination → less validation needed.

Full design: [claim-validation-system.md](./claim-validation-system.md)

---

## ADR-007: Security Model — Encryption, Passkeys, RBAC

**Status:** Accepted  
**Date:** 2026-02-22

**Context:** The application handles sensitive data (API keys, conversations, files) across multi-tenant workspaces. We need defense-in-depth security with zero trust between workspaces.

**Decision:**

1. **Authentication:** Passkeys (WebAuthn) as primary method; username/password (Argon2id) as fallback
2. **Encryption in transit:** TLS 1.3 for all HTTP and WebSocket connections
3. **Encryption at rest:** AES-256-GCM for sensitive fields (`node:crypto`), full-disk encryption for DB
4. **RBAC:** Workspace-scoped roles (owner/admin/member/viewer) checked on every request
5. **Workspace isolation:** All queries scoped by workspace ID; agents sandboxed per workspace
6. **Crypto:** Use only `node:crypto` (built-in, audited) — no third-party crypto libraries
7. **Audit logging:** All security-relevant actions logged to append-only table

Full design: [security-model.md](./security-model.md)

---

## ADR-008: OpenAPI Spec as API Source of Truth

**Status:** Accepted  
**Date:** 2026-02-22

**Context:** The application is API-first. We need a reliable, always-up-to-date API contract that serves both documentation and code generation.

**Decision:**

1. Maintain an **OpenAPI 3.1** specification as the single source of truth for all REST APIs
2. The spec is **auto-generated** from Fastify route schemas using `@fastify/swagger`
3. The spec lives at `apps/api/openapi.yaml` and is committed to the repo
4. **CI validates** that the generated spec matches the committed spec (drift detection)
5. The frontend uses `openapi-typescript` to generate TypeScript client types from the spec
6. This ensures frontend/backend type safety without manual synchronization

Benefits:

- API docs are always accurate (generated from code)
- Frontend types are always in sync (generated from spec)
- Third-party consumers can use the spec to generate clients in any language
- Agents can use the spec to understand available APIs

---

## ADR-009: Testing Strategy

**Status:** Accepted  
**Date:** 2026-02-22

**Context:** We need a testing strategy that catches bugs early, runs fast, and doesn't slow down development.

**Decision:**

1. **Unit tests are part of the Definition of Done** — no feature merges without tests
2. **Vitest** for all unit and integration tests (fast, native ESM, TypeScript-first)
3. **React Testing Library** for component tests (test behavior, not implementation)
4. **Supertest** for API endpoint tests (test the full HTTP layer)
5. Co-locate tests: `feature.ts` → `feature.test.ts`
6. Focus coverage on critical paths: auth, RBAC, workspace isolation, agent calls, claim validation
7. **Seed data system** for reproducible test environments with realistic data

---

## ADR-010: Seed Data System for Development & Testing

**Status:** Accepted  
**Date:** 2026-02-22

**Context:** Developers and testers need a quick way to spin up an environment with realistic data — users, agents, workspaces, channels, messages, files, and claims — without manual setup.

**Decision:**

1. Create a `seed` script (`pnpm seed`) that populates the database with test data
2. Seed data includes: test users, agents (with mock OpenRouter responses), workspaces, channels, messages with chat history, files, canvas nodes, and claims
3. Seed data is **deterministic** — same seed produces same data (use fixed UUIDs)
4. Seed data is **environment-gated** — only runs in `development` and `test` environments
5. A `reset` script (`pnpm db:reset`) drops all data and re-seeds
6. Test suites can use seed helpers to set up per-test fixtures

Full design: [seed-data.md](./seed-data.md)
