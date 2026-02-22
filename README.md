# AI Desktop 🖥️🤖

A web-based virtual desktop environment where humans and AI agents collaborate as first-class participants across workspaces, conversations, and tasks.

## Features

- **Workspaces** — Isolated environments for projects and teams
- **Agents** — AI assistants powered by OpenRouter (bring your own API key)
- **Chat** — Real-time conversations with humans and agents
- **Canvas** — Visual workspace for organizing ideas (Creative View)
- **Claim Validation** — Verify AI-generated claims with Zen Mode
- **RBAC** — Role-based access control (owner, admin, member)
- **Passkeys** — WebAuthn authentication with password fallback

## Tech Stack

| Layer    | Technologies                                      |
| -------- | ------------------------------------------------- |
| Frontend | React 19, Vite, Tailwind CSS, Zustand, React Flow |
| Backend  | Node.js, Fastify, Drizzle ORM, PostgreSQL 16      |
| Auth     | Passkeys (WebAuthn), JWT tokens                   |
| AI       | OpenRouter API (user-provided keys)               |
| Testing  | Vitest, React Testing Library                     |
| Monorepo | pnpm workspaces, Turborepo                        |

## Quick Start (Docker) 🚀

The fastest way to get started - everything is automated!

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### One Command Setup

```bash
# Clone the repository
git clone https://github.com/milanschwartz/ai-desktop.git
cd ai-desktop

# Set up environment variables
cp .env.example .env
# Edit .env and generate secrets with: openssl rand -base64 <length>

# Start all services
docker compose up
```

Open your browser to:

- **App**: http://localhost:3000
- **API Docs**: http://localhost:8080/docs

### Demo Credentials

- **Email**: `demo@ai-desktop.local`
- **Password**: `demo123456`

### Docker Commands

```bash
docker compose up        # Start all services
docker compose up -d     # Start in background
docker compose down      # Stop all services
docker compose down -v   # Stop and remove database data
docker compose logs -f   # View logs
```

---

## Development Setup

For local development with hot-reload:

### Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL 16+ (or use Docker for just the database)

### Installation

```bash
# Install pnpm (if not already installed)
npm install -g pnpm

# Install dependencies
pnpm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Start PostgreSQL with Docker (optional)
docker run --name ai-desktop-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ai_desktop -p 5432:5432 -d postgres:16

# Run database migrations
pnpm db:migrate

# Seed demo data
pnpm seed

# Start development servers
pnpm dev
```

### Access

- **Web App**: http://localhost:5173
- **API**: http://localhost:8080
- **API Docs**: http://localhost:8080/docs

## Project Structure

```
ai-desktop/
├── apps/
│   ├── api/                    # Fastify backend
│   │   ├── src/
│   │   │   ├── db/             # Database schema, migrations, seed
│   │   │   ├── middleware/     # Auth, RBAC
│   │   │   ├── routes/         # API endpoints
│   │   │   ├── services/       # Crypto, audit logging
│   │   │   └── ws/             # WebSocket handler
│   │   └── drizzle.config.ts
│   └── web/                    # React frontend
│       ├── src/
│       │   ├── components/     # Layout, Sidebar, Header
│       │   ├── features/       # Chat, Canvas, Claim Validation
│       │   ├── hooks/          # React Query hooks
│       │   ├── pages/          # Route pages
│       │   └── stores/         # Zustand state
│       └── vite.config.ts
├── packages/
│   └── shared/                 # Types, validation, constants
├── docs/
│   ├── architecture/           # ADRs, system design
│   ├── brainstorming/          # Early exploration notes
│   └── sessions/               # Development logs
├── .husky/                     # Git hooks
└── turbo.json                  # Turborepo config
```

## Scripts

```bash
# Development
pnpm dev              # Start all apps in dev mode

# Building
pnpm build            # Build all apps
pnpm typecheck        # Type check all apps

# Database
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run migrations
pnpm db:reset         # Reset database
pnpm seed             # Seed demo data

# Quality
pnpm lint             # Lint all apps
pnpm test             # Run all tests
pnpm test:watch       # Run tests in watch mode
pnpm format           # Format code with Prettier
pnpm format:check     # Check formatting
```

## Git Hooks

Pre-commit hooks are configured using Husky:

- **pre-commit**: Runs lint-staged (ESLint + Prettier on changed files)
- **commit-msg**: Validates conventional commit format

### Commit Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Examples**:

```
feat(chat): add message threading support
fix(auth): resolve token refresh edge case
docs(readme): update installation instructions
```

## Documentation

| Doc                                                              | Description                       |
| ---------------------------------------------------------------- | --------------------------------- |
| [MVP Design](docs/architecture/mvp-design.md)                    | Full system design document       |
| [Claim Validation](docs/architecture/claim-validation-system.md) | Trust & validation system design  |
| [Security Model](docs/architecture/security-model.md)            | Encryption, auth, RBAC, isolation |
| [Architecture Decisions](docs/architecture/decisions.md)         | ADRs for key technical choices    |
| [Copilot Instructions](.github/copilot-instructions.md)          | AI coding assistant guidelines    |

## Key Concepts

### Workspaces

Workspaces are isolated environments. Each workspace has:

- Members with roles (owner, admin, member)
- Channels for communication
- Agents assigned to assist
- Canvas for visual organization
- Knowledge base of validated facts

### Agents

AI agents are configured with:

- Name and avatar
- Model selection (Claude, GPT-4, Gemini, etc.)
- System prompt
- OpenRouter API key (encrypted)

### Claim Validation

When agents make factual claims:

1. Claims are highlighted in messages
2. Users can validate, deny, or request more info
3. Validated claims become facts in the workspace knowledge base
4. Zen Mode provides focused validation workflow

### View Modes

- **Structured View**: Traditional chat interface
- **Creative View**: Visual canvas with React Flow

## Security

- **Encryption at rest**: AES-256-GCM for sensitive data
- **Password hashing**: Argon2id
- **Auth tokens**: JWT with RS256
- **Workspace isolation**: All queries scoped by workspace ID
- **Rate limiting**: Configurable per endpoint

## License

MIT
