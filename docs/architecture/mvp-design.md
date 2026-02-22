# AI Desktop — MVP Design Document

**Date:** 2026-02-22  
**Status:** Draft  
**Version:** 0.1

---

## 1. Product Overview

AI Desktop is a web-based collaborative environment where humans and AI agents work together as peers. Users create **workspaces** organized around topics, invite **agents** and **other users**, and collaborate through multiple modalities — primarily **chat** and **images** in v1.

The application is **API-first**: every feature is exposed as a REST/WebSocket API, and the web UI is a consumer of that API. Agents interact through the same APIs as the frontend.

---

## 2. MVP Scope

### In Scope (v1)

| Feature              | Description                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------- |
| **User Auth**        | Passkeys (WebAuthn) preferred + username/password fallback; JWT tokens                      |
| **Agent Management** | Create/configure AI agents via OpenRouter (user provides API key)                           |
| **Workspaces**       | Create, manage, and switch between topic-based workspaces                                   |
| **Membership**       | Assign users and agents to workspaces with roles                                            |
| **Chat**             | Real-time threaded messaging (humans + agents) with markdown support                        |
| **Image Sharing**    | Upload, share, and discuss images in conversations                                          |
| **Two View Modes**   | **Structured** (linear lists, chats, panels) and **Creative** (spatial canvas)              |
| **Creative Canvas**  | Prezi-like infinite canvas with topic nodes, branching discussions, attached documents      |
| **Claim Validation** | Inline claim highlighting, hover source preview, Zen Mode for sequential validation         |
| **Knowledge Base**   | Validated facts stored and reused as trusted context for agents                             |
| **File Upload**      | Upload files per workspace; attach to messages and canvas nodes (full file manager post-v1) |
| **API-First**        | Full REST API + WebSocket events for every feature                                          |

### Out of Scope (v1)

- Video / audio calls
- OAuth / SSO
- Code editor / terminal apps
- Agent-to-agent autonomous collaboration
- Plugin/extension system
- Desktop metaphor (taskbar, system tray, window management)

---

## 3. User Roles & Participants

### Participant Types

| Type           | Description                                         |
| -------------- | --------------------------------------------------- |
| **Human User** | Authenticated person (passkey or username/password) |
| **AI Agent**   | LLM-powered participant configured via OpenRouter   |

### Workspace Roles

| Role       | Permissions                                                      |
| ---------- | ---------------------------------------------------------------- |
| **Owner**  | Full control — manage workspace, members, settings, delete       |
| **Admin**  | Manage members, configure agents, moderate content               |
| **Member** | Participate in conversations, share content, use both view modes |
| **Viewer** | Read-only access to workspace content                            |

Agents are assigned a role just like human users (typically **Member**).

---

## 4. Core Concepts

### 4.1 Workspaces

A workspace is a **topic-based collaboration space** containing:

- A set of **participants** (users + agents)
- **Channels** for organized conversations
- A **creative canvas** for spatial brainstorming
- Shared **documents and images**
- **Settings** (name, description, default view mode, agent configs)

```
Workspace
├── Channels (structured conversations)
│   ├── #general
│   ├── #research
│   └── #decisions
├── Canvas (creative spatial view)
│   ├── Topic Node: "Core Architecture"
│   │   ├── Discussion thread
│   │   ├── Attached documents
│   │   └── Branch → "Database Options"
│   └── Topic Node: "UI Design"
│       ├── Discussion thread
│       └── Images
└── Files (shared images & documents)
```

### 4.2 View Modes

Every workspace can be viewed in two modes. Users toggle between them freely.

#### Structured Mode

- **Linear, familiar layout** — sidebar + main content area
- Channel list on the left, chat/content on the right
- Threaded conversations with chronological messages
- Lists, tables, and organized panels
- Best for: focused work, decision-making, task tracking

#### Creative Mode

- **Infinite spatial canvas** (Prezi-like)
- **Topic nodes** placed freely on the canvas — each is a discussion hub
- **Branching**: create child topics that inherit context from the parent
- **Zoom & pan** navigation — zoom into a topic for detail, zoom out for overview
- **Attachments**: pin documents, images, and notes to topic nodes
- **Connections**: draw visual links between related topics
- Best for: brainstorming, exploration, mapping ideas, non-linear thinking

Both modes share the **same underlying data** — a message posted in structured mode appears on the relevant canvas node, and vice versa.

### 4.3 Agents

An agent is an AI participant powered by an LLM via OpenRouter.

```
Agent
├── Name & avatar
├── System prompt (personality, expertise, instructions)
├── Model selection (via OpenRouter — GPT-4, Claude, Llama, etc.)
├── OpenRouter API key (per-user or per-workspace)
├── Capabilities (which tools/actions the agent can perform)
└── Workspace memberships
```

**Agent behavior:**

- Agents respond when @mentioned or when configured to auto-participate
- Agents can read conversation history for context
- Agents can generate text and describe/analyze images
- Agents interact through the same API as the frontend
- Each agent has its own identity (name, avatar, color) in conversations

### 4.4 Messages & Content

```
Message
├── Author (user or agent)
├── Content (markdown text)
├── Attachments (images, documents)
├── Thread (parent message for replies)
├── Channel or Canvas Node reference
├── Timestamps (created, edited)
└── Reactions
```

---

## 5. Architecture Overview

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Web Frontend                      │
│              (React + TypeScript SPA)                │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Structured   │  │   Creative   │  │   Shared   │ │
│  │  Mode View    │  │  Canvas View │  │ Components │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
└──────────────┬──────────────────────────┬────────────┘
               │ REST API                 │ WebSocket
               ▼                          ▼
┌─────────────────────────────────────────────────────┐
│                   API Server                         │
│                (Node.js + Fastify)                   │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │   Auth   │ │Workspace │ │  Agent   │ │  Chat  │ │
│  │ Service  │ │ Service  │ │ Service  │ │Service │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Canvas  │ │  File    │ │ WebSocket│            │
│  │ Service  │ │ Service  │ │  Gateway │            │
│  └──────────┘ └──────────┘ └──────────┘            │
└──────────────┬──────────────────────────┬────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────┐    ┌──────────────────────────┐
│     PostgreSQL       │    │      OpenRouter API       │
│  (primary datastore) │    │   (LLM provider gateway)  │
└──────────────────────┘    └──────────────────────────┘
```

### 5.2 Tech Stack

| Layer            | Choice                          | Rationale                                    |
| ---------------- | ------------------------------- | -------------------------------------------- |
| **Frontend**     | React 19 + TypeScript + Vite    | Mature ecosystem, great for complex UIs      |
| **Styling**      | Tailwind CSS                    | Rapid prototyping, consistent design system  |
| **Canvas**       | React Flow or custom Canvas API | Spatial node-based UI for creative mode      |
| **State**        | Zustand                         | Lightweight, TypeScript-friendly             |
| **Backend**      | Node.js + Fastify               | Fast, TypeScript-native, great plugin system |
| **ORM**          | Drizzle ORM                     | Type-safe, lightweight, SQL-first            |
| **Database**     | PostgreSQL 16                   | Robust, JSON support, full-text search       |
| **Real-time**    | WebSocket (ws / Socket.io)      | Bi-directional real-time messaging           |
| **Auth**         | JWT (access + refresh tokens)   | Stateless, API-friendly                      |
| **File Storage** | Local disk (v1) → S3 (later)    | Simple start, easy to migrate                |
| **AI Gateway**   | OpenRouter API                  | Multi-model access, single API key           |
| **Monorepo**     | pnpm workspaces + Turborepo     | Shared types between frontend/backend        |

### 5.3 Project Structure

```
ai-desktop/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/     # Shared UI components
│   │   │   ├── features/
│   │   │   │   ├── auth/       # Login, register
│   │   │   │   ├── workspace/  # Workspace management
│   │   │   │   ├── chat/       # Structured mode chat
│   │   │   │   ├── canvas/     # Creative mode canvas
│   │   │   │   └── agents/     # Agent configuration
│   │   │   ├── hooks/          # Shared hooks
│   │   │   ├── lib/            # API client, utils
│   │   │   ├── stores/         # Zustand stores
│   │   │   └── types/          # Frontend-specific types
│   │   └── ...
│   └── api/                    # Fastify backend
│       ├── src/
│       │   ├── routes/         # API route handlers
│       │   ├── services/       # Business logic
│       │   ├── middleware/     # Auth, validation, etc.
│       │   ├── db/             # Schema, migrations, queries
│       │   ├── ws/             # WebSocket handlers
│       │   ├── agents/         # OpenRouter integration
│       │   └── types/          # Backend-specific types
│       └── ...
├── packages/
│   └── shared/                 # Shared types, constants, validation
│       └── src/
│           ├── types/          # Shared TypeScript interfaces
│           ├── constants/      # Shared constants
│           └── validation/     # Shared Zod schemas
├── docs/
├── .devcontainer/
└── ...
```

---

## 6. Data Model

### Entity Relationship Diagram

```
┌──────────┐     ┌──────────────────┐     ┌──────────┐
│   User   │────<│ WorkspaceMember   │>────│Workspace │
└──────────┘     └──────────────────┘     └──────────┘
     │                                         │
     │           ┌──────────────────┐          │
     │           │ WorkspaceAgent   │>─────────┤
     │           └──────────────────┘          │
     │                  │                      │
     │                  ▼                      │
     │           ┌──────────┐           ┌──────────┐
     │           │  Agent   │           │ Channel  │
     │           └──────────┘           └──────────┘
     │                                        │
     │           ┌──────────────────┐         │
     └──────────>│    Message       │<────────┘
                 └──────────────────┘
                        │
                 ┌──────────────────┐
                 │   Attachment     │
                 └──────────────────┘

                 ┌──────────────────┐
                 │  CanvasNode      │>────── Workspace
                 └──────────────────┘
                        │
                 ┌──────────────────┐
                 │ CanvasEdge       │
                 └──────────────────┘
```

### Core Tables

#### `users`

| Column        | Type         | Description                                       |
| ------------- | ------------ | ------------------------------------------------- |
| id            | UUID         | Primary key                                       |
| username      | VARCHAR(50)  | Unique username                                   |
| display_name  | VARCHAR(100) | Display name                                      |
| password_hash | VARCHAR(255) | Argon2id hash                                     |
| avatar_url    | TEXT         | Profile picture URL                               |
| settings      | JSONB        | User preferences (default view mode, theme, etc.) |
| created_at    | TIMESTAMP    |                                                   |
| updated_at    | TIMESTAMP    |                                                   |

#### `agents`

| Column             | Type         | Description                 |
| ------------------ | ------------ | --------------------------- |
| id                 | UUID         | Primary key                 |
| name               | VARCHAR(100) | Agent display name          |
| avatar_url         | TEXT         | Agent avatar                |
| system_prompt      | TEXT         | Personality & instructions  |
| model              | VARCHAR(100) | OpenRouter model identifier |
| openrouter_api_key | VARCHAR(255) | Encrypted API key           |
| capabilities       | JSONB        | Enabled capabilities/tools  |
| created_by         | UUID → users | Owner of this agent         |
| is_active          | BOOLEAN      | Whether agent is enabled    |
| created_at         | TIMESTAMP    |                             |
| updated_at         | TIMESTAMP    |                             |

#### `workspaces`

| Column            | Type         | Description                |
| ----------------- | ------------ | -------------------------- |
| id                | UUID         | Primary key                |
| name              | VARCHAR(200) | Workspace name             |
| description       | TEXT         | Workspace description      |
| default_view_mode | ENUM         | 'structured' or 'creative' |
| settings          | JSONB        | Workspace-level settings   |
| created_by        | UUID → users | Creator                    |
| created_at        | TIMESTAMP    |                            |
| updated_at        | TIMESTAMP    |                            |

#### `workspace_members`

| Column       | Type              | Description                          |
| ------------ | ----------------- | ------------------------------------ |
| workspace_id | UUID → workspaces |                                      |
| user_id      | UUID → users      |                                      |
| role         | ENUM              | 'owner', 'admin', 'member', 'viewer' |
| joined_at    | TIMESTAMP         |                                      |

#### `workspace_agents`

| Column           | Type              | Description                     |
| ---------------- | ----------------- | ------------------------------- |
| workspace_id     | UUID → workspaces |                                 |
| agent_id         | UUID → agents     |                                 |
| role             | ENUM              | 'member', 'viewer'              |
| config_overrides | JSONB             | Workspace-specific agent config |
| added_at         | TIMESTAMP         |                                 |

#### `channels`

| Column       | Type              | Description       |
| ------------ | ----------------- | ----------------- |
| id           | UUID              | Primary key       |
| workspace_id | UUID → workspaces |                   |
| name         | VARCHAR(100)      | Channel name      |
| description  | TEXT              |                   |
| is_default   | BOOLEAN           | Auto-join channel |
| created_at   | TIMESTAMP         |                   |

#### `messages`

| Column         | Type                | Description                                 |
| -------------- | ------------------- | ------------------------------------------- |
| id             | UUID                | Primary key                                 |
| channel_id     | UUID → channels     | NULL if canvas-only                         |
| canvas_node_id | UUID → canvas_nodes | NULL if channel-only                        |
| author_type    | ENUM                | 'user' or 'agent'                           |
| author_id      | UUID                | → users or agents                           |
| content        | TEXT                | Markdown content                            |
| parent_id      | UUID → messages     | Thread parent (NULL for top-level)          |
| metadata       | JSONB               | Extra data (agent model used, tokens, etc.) |
| created_at     | TIMESTAMP           |                                             |
| updated_at     | TIMESTAMP           |                                             |

#### `attachments`

| Column         | Type            | Description           |
| -------------- | --------------- | --------------------- |
| id             | UUID            | Primary key           |
| message_id     | UUID → messages |                       |
| file_name      | VARCHAR(255)    | Original filename     |
| file_type      | VARCHAR(100)    | MIME type             |
| file_size      | INTEGER         | Size in bytes         |
| storage_path   | TEXT            | Path on disk / S3 key |
| thumbnail_path | TEXT            | Thumbnail for images  |
| created_at     | TIMESTAMP       |                       |

#### `canvas_nodes`

| Column         | Type                | Description                         |
| -------------- | ------------------- | ----------------------------------- |
| id             | UUID                | Primary key                         |
| workspace_id   | UUID → workspaces   |                                     |
| parent_node_id | UUID → canvas_nodes | For branching (NULL = root)         |
| title          | VARCHAR(200)        | Topic title                         |
| description    | TEXT                | Topic description                   |
| position_x     | FLOAT               | X position on canvas                |
| position_y     | FLOAT               | Y position on canvas                |
| width          | FLOAT               | Node width                          |
| height         | FLOAT               | Node height                         |
| style          | JSONB               | Visual styling (color, shape, etc.) |
| created_by     | UUID → users        |                                     |
| created_at     | TIMESTAMP           |                                     |
| updated_at     | TIMESTAMP           |                                     |

#### `canvas_edges`

| Column         | Type                | Description    |
| -------------- | ------------------- | -------------- |
| id             | UUID                | Primary key    |
| workspace_id   | UUID → workspaces   |                |
| source_node_id | UUID → canvas_nodes |                |
| target_node_id | UUID → canvas_nodes |                |
| label          | VARCHAR(100)        | Edge label     |
| style          | JSONB               | Visual styling |
| created_at     | TIMESTAMP           |                |

---

## 7. API Design

### Base URL: `/api/v1`

### Authentication

| Method | Endpoint         | Description              |
| ------ | ---------------- | ------------------------ |
| POST   | `/auth/register` | Register new user        |
| POST   | `/auth/login`    | Login → returns JWT pair |
| POST   | `/auth/refresh`  | Refresh access token     |
| POST   | `/auth/logout`   | Invalidate refresh token |
| GET    | `/auth/me`       | Get current user profile |

### Users

| Method | Endpoint              | Description                |
| ------ | --------------------- | -------------------------- |
| GET    | `/users`              | List users (search/filter) |
| GET    | `/users/:id`          | Get user profile           |
| PATCH  | `/users/:id`          | Update user profile        |
| PATCH  | `/users/:id/settings` | Update user settings       |

### Agents

| Method | Endpoint           | Description                  |
| ------ | ------------------ | ---------------------------- |
| POST   | `/agents`          | Create a new agent           |
| GET    | `/agents`          | List user's agents           |
| GET    | `/agents/:id`      | Get agent details            |
| PATCH  | `/agents/:id`      | Update agent config          |
| DELETE | `/agents/:id`      | Delete agent                 |
| POST   | `/agents/:id/test` | Send a test message to agent |

### Workspaces

| Method | Endpoint          | Description            |
| ------ | ----------------- | ---------------------- |
| POST   | `/workspaces`     | Create workspace       |
| GET    | `/workspaces`     | List user's workspaces |
| GET    | `/workspaces/:id` | Get workspace details  |
| PATCH  | `/workspaces/:id` | Update workspace       |
| DELETE | `/workspaces/:id` | Delete workspace       |

### Workspace Members

| Method | Endpoint                          | Description        |
| ------ | --------------------------------- | ------------------ |
| GET    | `/workspaces/:id/members`         | List members       |
| POST   | `/workspaces/:id/members`         | Add member (user)  |
| PATCH  | `/workspaces/:id/members/:userId` | Update member role |
| DELETE | `/workspaces/:id/members/:userId` | Remove member      |

### Workspace Agents

| Method | Endpoint                          | Description            |
| ------ | --------------------------------- | ---------------------- |
| GET    | `/workspaces/:id/agents`          | List workspace agents  |
| POST   | `/workspaces/:id/agents`          | Add agent to workspace |
| PATCH  | `/workspaces/:id/agents/:agentId` | Update agent config    |
| DELETE | `/workspaces/:id/agents/:agentId` | Remove agent           |

### Channels

| Method | Endpoint                   | Description    |
| ------ | -------------------------- | -------------- |
| GET    | `/workspaces/:id/channels` | List channels  |
| POST   | `/workspaces/:id/channels` | Create channel |
| PATCH  | `/channels/:id`            | Update channel |
| DELETE | `/channels/:id`            | Delete channel |

### Messages

| Method | Endpoint                 | Description               |
| ------ | ------------------------ | ------------------------- |
| GET    | `/channels/:id/messages` | List messages (paginated) |
| POST   | `/channels/:id/messages` | Send message              |
| PATCH  | `/messages/:id`          | Edit message              |
| DELETE | `/messages/:id`          | Delete message            |
| GET    | `/messages/:id/thread`   | Get thread replies        |
| POST   | `/messages/:id/thread`   | Reply in thread           |

### Canvas

| Method | Endpoint                       | Description                     |
| ------ | ------------------------------ | ------------------------------- |
| GET    | `/workspaces/:id/canvas`       | Get full canvas (nodes + edges) |
| POST   | `/workspaces/:id/canvas/nodes` | Create topic node               |
| PATCH  | `/canvas/nodes/:id`            | Update node (position, content) |
| DELETE | `/canvas/nodes/:id`            | Delete node                     |
| POST   | `/workspaces/:id/canvas/edges` | Create edge                     |
| DELETE | `/canvas/edges/:id`            | Delete edge                     |
| GET    | `/canvas/nodes/:id/messages`   | Get messages for a canvas node  |
| POST   | `/canvas/nodes/:id/messages`   | Post message to canvas node     |

### Files / Attachments

| Method | Endpoint               | Description                               |
| ------ | ---------------------- | ----------------------------------------- |
| POST   | `/upload`              | Upload file (returns attachment metadata) |
| GET    | `/files/:id`           | Download/serve file                       |
| GET    | `/files/:id/thumbnail` | Get image thumbnail                       |

### WebSocket Events

Connection: `ws://host/ws?token=<jwt>`

#### Client → Server

| Event                | Payload                                | Description                   |
| -------------------- | -------------------------------------- | ----------------------------- |
| `join_workspace`     | `{ workspaceId }`                      | Subscribe to workspace events |
| `leave_workspace`    | `{ workspaceId }`                      | Unsubscribe                   |
| `send_message`       | `{ channelId, content, attachments? }` | Send chat message             |
| `typing_start`       | `{ channelId }`                        | User started typing           |
| `typing_stop`        | `{ channelId }`                        | User stopped typing           |
| `canvas_node_move`   | `{ nodeId, x, y }`                     | Move node on canvas           |
| `canvas_node_update` | `{ nodeId, ...changes }`               | Update node properties        |

#### Server → Client

| Event             | Payload                  | Description                   |
| ----------------- | ------------------------ | ----------------------------- |
| `message_created` | `{ message }`            | New message in channel/canvas |
| `message_updated` | `{ message }`            | Message edited                |
| `message_deleted` | `{ messageId }`          | Message removed               |
| `member_joined`   | `{ member }`             | New member in workspace       |
| `member_left`     | `{ userId }`             | Member left workspace         |
| `agent_typing`    | `{ agentId, channelId }` | Agent is generating response  |
| `agent_response`  | `{ message }`            | Agent finished responding     |
| `canvas_updated`  | `{ nodes, edges }`       | Canvas state changed          |
| `presence_update` | `{ userId, status }`     | User online/offline/away      |

---

## 8. Agent Integration Flow

```
User sends message with @agent mention
         │
         ▼
API Server receives message
         │
         ├── Store message in DB
         ├── Broadcast via WebSocket to workspace members
         │
         ▼
Agent Service triggered
         │
         ├── Load agent config (system prompt, model)
         ├── Build context (recent messages, workspace info)
         ├── Attach any images as base64/URLs
         │
         ▼
Call OpenRouter API
         │
         ├── POST https://openrouter.ai/api/v1/chat/completions
         ├── Model: agent's configured model
         ├── Messages: system prompt + conversation context
         │
         ▼
Stream response back
         │
         ├── Broadcast `agent_typing` event
         ├── Stream tokens via WebSocket (optional)
         ├── On completion: store agent message in DB
         └── Broadcast `agent_response` event
```

---

## 9. UI Wireframes (Conceptual)

### Structured Mode Layout

```
┌─────────────────────────────────────────────────────────┐
│  ◉ AI Desktop          [Workspace: Project Alpha ▾]  ⚙️ │
├────────────┬────────────────────────────────────────────┤
│            │                                            │
│ WORKSPACES │  #general                    [Structured ↔ │
│ ──────────│                               Creative]    │
│ ▸ Project A│  ┌────────────────────────┐  ┌──────────┐ │
│ ▸ Research │  │ Milan: Hey @ResearchBot│  │ Members  │ │
│ ▸ Design   │  │ can you look into...   │  │ ──────── │ │
│            │  │                        │  │ 👤 Milan │ │
│ CHANNELS   │  │ 🤖 ResearchBot:       │  │ 👤 Alex  │ │
│ ──────────│  │ I found several...     │  │ 🤖 ResBot│ │
│ # general  │  │ [image.png]            │  │ 🤖 Writer│ │
│ # research │  │                        │  │          │ │
│ # design   │  │ Alex: Great find!      │  │ Agents   │ │
│            │  │ Let's branch this...   │  │ ──────── │ │
│ AGENTS     │  └────────────────────────┘  │ + Add    │ │
│ ──────────│                               │          │ │
│ 🤖 ResBot  │  ┌────────────────────────┐  └──────────┘ │
│ 🤖 Writer  │  │ Type a message...  📎 📤│              │
│ + Create   │  └────────────────────────┘               │
├────────────┴────────────────────────────────────────────┤
│  👤 Milan (online)                          [◉ ◉ ◉]    │
└─────────────────────────────────────────────────────────┘
```

### Creative Mode Layout

```
┌─────────────────────────────────────────────────────────┐
│  ◉ AI Desktop          [Workspace: Project Alpha ▾]  ⚙️ │
├─────────────────────────────────────────────────────────┤
│  [Structured ↔ Creative]    🔍 Zoom: 75%    ✋ Pan     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│    ┌─────────────┐          ┌─────────────┐            │
│    │ 🏗️ Core     │─────────│ 🎨 UI Design │            │
│    │ Architecture│          │             │            │
│    │             │          │ "Modern,    │            │
│    │ 12 messages │          │  clean..."  │            │
│    │ 3 docs      │          │ 8 messages  │            │
│    └──────┬──────┘          └─────────────┘            │
│           │                                             │
│     ┌─────┴─────┐                                      │
│     │           │                                      │
│  ┌──▼────────┐ ┌▼───────────┐                          │
│  │ 🗄️ Database│ │ 🔌 API     │    ┌─────────────┐      │
│  │ Options   │ │ Design     │    │ + New Topic  │      │
│  │           │ │            │    │              │      │
│  │ 5 messages│ │ 15 messages│    └─────────────┘      │
│  │ 2 images  │ │ 1 doc      │                          │
│  └───────────┘ └────────────┘                          │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 💬 Discussion: API Design          [minimize ─]  │  │
│  │ Milan: We should use REST + WebSocket...         │  │
│  │ 🤖 ResBot: Based on the requirements...          │  │
│  │ ____________________________________________ 📎 📤│  │
│  └──────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  👤 Milan (online)                          [◉ ◉ ◉]    │
└─────────────────────────────────────────────────────────┘
```

---

## 10. Key User Flows

### Flow 1: Getting Started

1. User registers with username/password
2. User creates their first workspace
3. User creates an AI agent (picks model, writes system prompt, enters OpenRouter key)
4. User adds the agent to the workspace
5. User starts chatting in #general — @mentions the agent
6. Agent responds in real-time

### Flow 2: Creative Brainstorming

1. User switches to Creative mode
2. Creates a topic node: "Product Strategy"
3. Starts a discussion on the node, @mentions agent for ideas
4. Agent contributes ideas as messages on the node
5. User branches into "Pricing" and "Marketing" child topics
6. Each branch has its own focused discussion
7. User zooms out to see the full idea landscape

### Flow 3: Structured Collaboration

1. User is in Structured mode
2. Creates channels: #research, #design, #decisions
3. Assigns research agent to #research
4. Agent auto-monitors the channel and contributes when relevant
5. User shares images for discussion
6. Team makes decisions in #decisions channel

---

## 11. Security Considerations

> Full security design: [security-model.md](./security-model.md)

| Concern                   | Approach                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| **Authentication**        | Passkeys (WebAuthn) preferred; username/password (Argon2id) as fallback                         |
| **Tokens**                | JWT access (15min, memory only) + refresh (7d, HttpOnly cookie, rotated)                        |
| **Encryption in transit** | TLS 1.3 (HTTPS + WSS), HSTS, strong ciphers only                                                |
| **Encryption at rest**    | AES-256-GCM for sensitive fields (API keys, files); full-disk encryption for DB                 |
| **RBAC**                  | Workspace-scoped roles (owner/admin/member/viewer); checked on every request                    |
| **Workspace isolation**   | All queries scoped by workspace ID; agents sandboxed per workspace (no cross-workspace context) |
| **Input validation**      | Zod schemas on all API inputs; parameterized queries (Drizzle ORM)                              |
| **File uploads**          | MIME type + magic bytes validation, size limits, path traversal prevention                      |
| **Rate limiting**         | Per-endpoint limits (login, messages, agent calls, uploads)                                     |
| **CORS**                  | Strict origin whitelist                                                                         |
| **WebSocket auth**        | One-time ticket (30s TTL) for connection, JWT validation                                        |
| **Security headers**      | CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy                             |
| **Audit logging**         | All security-relevant actions logged (login, role changes, API key changes)                     |
| **Crypto libraries**      | `node:crypto` (built-in, audited) + `@simplewebauthn/*` for passkeys                            |

---

## 12. Non-Functional Requirements

| Requirement              | Target                |
| ------------------------ | --------------------- |
| **Page load**            | < 2s initial load     |
| **Message delivery**     | < 200ms (WebSocket)   |
| **Agent response start** | < 2s (first token)    |
| **Concurrent users**     | 50+ per instance (v1) |
| **Image upload**         | Up to 10MB per file   |
| **Canvas nodes**         | 500+ per workspace    |
| **Message history**      | Unlimited (paginated) |

---

## 13. Implementation Phases

### Phase A: Foundation (Week 1-2)

- [ ] Project scaffolding (monorepo, shared types, Vitest setup)
- [ ] Database schema + migrations (Drizzle)
- [ ] Auth system — passkeys (WebAuthn) + password fallback, JWT tokens
- [ ] RBAC middleware (workspace-scoped role checks)
- [ ] OpenAPI auto-generation (`@fastify/swagger`) + TypeScript client types
- [ ] Seed data system (`pnpm seed` / `pnpm db:reset`)
- [ ] Basic API structure with Zod validation
- [ ] Unit tests for auth + RBAC

### Phase B: Core Features (Week 3-4)

- [ ] Workspace CRUD + membership + workspace selector UI
- [ ] Channel CRUD
- [ ] Message CRUD + real-time (WebSocket)
- [ ] Agent creation + OpenRouter integration
- [ ] File manager (upload, browse, organize per workspace)
- [ ] Basic structured mode UI
- [ ] Workspace isolation tests (cross-workspace access denied)
- [ ] Unit tests for all CRUD operations

### Phase C: Creative Mode + Validation (Week 5-6)

- [ ] Canvas data model + API
- [ ] Canvas UI (nodes, edges, zoom, pan)
- [ ] Topic discussions on canvas nodes
- [ ] Branching topics
- [ ] Shared data between structured ↔ creative
- [ ] Claim extraction + inline highlighting
- [ ] Hover source preview + quick validation
- [ ] Unit tests for canvas + claim extraction

### Phase D: Polish (Week 7-8)

- [ ] Zen Mode (sequential claim validation)
- [ ] Knowledge base (validated facts → agent context injection)
- [ ] Image upload + sharing
- [ ] Agent streaming responses
- [ ] Presence indicators
- [ ] Responsive design
- [ ] Error handling + loading states
- [ ] Encryption at rest for sensitive fields
- [ ] Audit logging
- [ ] OpenAPI spec finalization + documentation
- [ ] Seed data with full realistic scenario
