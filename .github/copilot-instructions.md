# Copilot Instructions for AI Desktop

## Project Overview

AI Desktop is a web-based virtual desktop environment where humans and AI agents collaborate as first-class participants across workspaces, conversations, and tasks.

---

## Effective Development Journey

When building a project from scratch with AI assistance, follow these steps in order. Each phase builds on the previous one.

### Phase 1: Brainstorm & Define

1. **Brainstorm freely** — Explore the problem space, generate ideas, identify differentiators.
2. **Document everything** — Save brainstorming notes in `docs/brainstorming/` with dated entries.
3. **Define the vision** — Write a clear one-paragraph description of what the product is.
4. **Identify open questions** — List unknowns and decisions that need to be made.

### Phase 2: Scope & Decide

5. **Define v1 scope** — Pick the smallest useful version. Resist feature creep.
6. **Make architecture decisions** — Record them in `docs/architecture/decisions.md` as ADRs.
7. **Choose the tech stack** — Pick tools the team knows, with good ecosystem support.
8. **Design the data model** — Sketch entities, relationships, and key flows.

### Phase 3: Scaffold & Build

9. **Set up the dev environment** — Devcontainer, linting, formatting, CI from day one.
10. **Scaffold the project** — Create the folder structure, install dependencies, wire up basics.
11. **Build vertically** — Implement one full feature end-to-end before broadening.
12. **Write tests alongside code** — Not after. Test the critical paths.

### Phase 4: Iterate & Ship

13. **Demo early** — Get something visual running as fast as possible.
14. **Iterate in small PRs** — Each PR should be reviewable in < 15 minutes.
15. **Refactor as you go** — Don't let tech debt accumulate in early stages.
16. **Document as you build** — Update README, add inline comments for complex logic.

---

## Code Conventions

### General

- Use **TypeScript** for all JavaScript code (strict mode).
- Prefer **functional components** and hooks in React.
- Use **named exports** over default exports.
- Keep files focused — one component/module per file.
- Use **descriptive variable names** — no single-letter variables except in loops.
- **Use modern libraries and patterns** — prefer well-maintained, popular libraries over hand-rolling. Less code = fewer bugs.
- **Minimal and aesthetic code** — favor readability and simplicity. If a 3-line solution exists, don't write 30 lines.
- **Leverage the ecosystem** — use established patterns (React Query for data fetching, Zod for validation, etc.) instead of reinventing them.

### Security

- **Encrypt all data in transit** (TLS 1.3) and **at rest** (AES-256-GCM).
- Use `node:crypto` for all cryptographic operations — no third-party crypto.
- **Passkeys (WebAuthn) preferred** for authentication; username/password as fallback.
- All API inputs validated with **Zod schemas** — no unvalidated data reaches business logic.
- All database queries **scoped by workspace ID** — never fetch without workspace context.
- Sensitive fields (API keys, tokens) encrypted at the application level.
- See [Security Model](../docs/architecture/security-model.md) for full details.

### Testing

- **Unit tests are part of the Definition of Done** — no feature is complete without tests.
- Use **Vitest** for unit/integration tests (fast, native ESM, TypeScript-first).
- Use **React Testing Library** for component tests.
- Use **Supertest** for API endpoint tests.
- Co-locate test files next to source: `feature.ts` → `feature.test.ts`.
- Test the **behavior**, not the implementation — test what it does, not how.
- Aim for meaningful coverage on critical paths (auth, RBAC, agent calls, claim validation).

### API Documentation

- Maintain an **OpenAPI 3.1** spec as the source of truth for all REST APIs.
- The spec lives at `apps/api/openapi.yaml` and is **auto-generated** from route schemas (Fastify + `@fastify/swagger`).
- The spec must be **kept up to date** — CI validates that the spec matches the implementation.
- Use the spec to generate **TypeScript client types** for the frontend (`openapi-typescript`).

### File Organization

```
src/
  components/    # Reusable UI components
  features/      # Feature-specific modules (co-located components, hooks, utils)
  hooks/         # Shared custom hooks
  lib/           # Utility functions, API clients, constants
  types/         # Shared TypeScript types/interfaces
  styles/        # Global styles, theme
```

### Naming

- **Files:** `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- **Components:** PascalCase (`WindowManager`, `ChatPanel`)
- **Hooks:** camelCase with `use` prefix (`useWindowState`, `useAgent`)
- **Types/Interfaces:** PascalCase with descriptive names (`WindowConfig`, `AgentMessage`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_WINDOWS`, `DEFAULT_THEME`)

### Styling

- Use CSS Modules or Tailwind CSS (decide in ADR).
- Keep styles co-located with components.
- Use CSS custom properties for theming.

### Git

- **Branch naming:** `feature/short-description`, `fix/short-description`, `docs/short-description`
- **Commit messages:** Use conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`)
- **PR size:** Keep PRs small and focused.

---

## Working with AI Agents in This Codebase

- When adding a new **desktop app**, create it as a feature module under `src/features/`.
- When adding a new **agent capability**, define the tool interface in `src/types/` and implement in `src/lib/agents/`.
- Always consider both **human and agent** users when designing UI — agents need programmatic access to the same features.
- Real-time features should use the shared WebSocket connection, not create new ones.

---

## Documentation

- **Brainstorming notes** → `docs/brainstorming/`
- **Architecture decisions** → `docs/architecture/`
- **API documentation** → `docs/api/`
- **User guides** → `docs/guides/`
- **Meeting notes / session logs** → `docs/sessions/`

---

## Key Principles

1. **Agents are first-class** — Never treat AI as an afterthought or bolt-on.
2. **Start simple, grow organically** — Build the smallest useful thing first.
3. **Real-time by default** — Everything should feel live and collaborative.
4. **Context is king** — Agents need rich context to be useful. Design for it.
5. **Extensible** — Every built-in feature should be buildable as a plugin too.
6. **Modern and minimal** — Use the latest stable libraries, patterns, and APIs. Keep code aesthetic, concise, and easy to understand. If a library does it well, use it.

---

## Self-Improving Instructions

When the user **approves and compliments** a completed task (e.g., "great", "perfect", "that worked", "love it"), extract the **general-purpose pattern or technique** that made it successful and append it to the **Learned Patterns** section below. Write it in a reusable, project-agnostic form so it benefits future projects — not just this one.

### Learned Patterns

- **Scaffold docs and dev environment before code** — When starting a new project, set up documentation structure (`docs/`, ADRs, instructions), copilot/AI guidelines, and a devcontainer _before_ writing any application code. This creates a shared foundation that keeps all future work organized and consistent.
- **Build incrementally with tests alongside code** — When developing an MVP, create the foundation first (monorepo, shared package, database schema), then build features vertically (auth → routes → frontend), and add tests for critical paths (auth, RBAC, crypto, validation) as you go rather than at the end.
- **Set up pre-commit hooks early** — Configure Husky, lint-staged, commitlint, and Prettier early in the project to enforce code quality and conventional commits from the start. Include trailing whitespace removal, ESLint for TypeScript, and formatting for JSON/YAML files to maintain consistency across the codebase.

<!--
Format for new entries:
- **Short title** — One-sentence description of the reusable pattern or technique.
-->
