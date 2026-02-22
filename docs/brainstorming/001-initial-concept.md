# AI Desktop — Initial Concept Brainstorm

**Date:** 2026-02-22  
**Participants:** Human + GitHub Copilot

---

## Core Concept

A **web-based virtual desktop environment** where humans and AI agents coexist as first-class participants — collaborating in real-time across workspaces, conversations, and tasks.

---

## Key Design Pillars

### 1. Desktop Metaphor

- A familiar windowed environment (think: OS-in-a-browser)
- Draggable, resizable windows/panels for different tools
- Taskbar, system tray, notifications
- Virtual desktops / workspaces for different topics or projects

### 2. Agents as Peers

- AI agents appear as "users" with avatars, presence indicators, and roles
- Agents can be invited into workspaces, assigned tasks, and @mentioned
- Each agent has capabilities (research, coding, writing, analysis, etc.)
- Agents can collaborate with _each other_, not just with humans

### 3. Collaboration Spaces

- **Chat rooms** — threaded conversations (human + agent)
- **Whiteboards** — visual brainstorming with sticky notes, diagrams
- **Documents** — collaborative editing (like Google Docs, but agents can co-author)
- **Kanban boards** — task management where agents can pick up and complete tasks
- **Code editors** — pair programming with AI
- **Terminals** — agents can run commands, scripts, deployments

### 4. Topic-Based Organization

- Everything organized around **topics/projects**
- Each topic gets its own workspace with relevant tools, context, and participants
- Persistent context — agents remember the topic history

### 5. App Ecosystem

- Built-in apps: Chat, Files, Notes, Calendar, Tasks, Browser
- Plugin/extension system for custom apps
- Agents can _use_ apps autonomously (browse the web, read files, etc.)

---

## Architecture Ideas

| Layer             | Technology                                                              |
| ----------------- | ----------------------------------------------------------------------- |
| **Frontend**      | React/Next.js, windowing library (e.g., react-rnd), WebSockets          |
| **Backend**       | Node.js / Python, real-time sync (WebSockets / CRDTs)                   |
| **AI Layer**      | LLM APIs (OpenAI, Anthropic, local models), tool-use / function calling |
| **Auth & Collab** | OAuth, presence system, operational transforms or CRDTs                 |
| **Storage**       | PostgreSQL + vector DB for agent memory, S3 for files                   |

---

## Differentiators

| Feature                        | Slack/Teams                | Traditional OS | **AI Desktop** |
| ------------------------------ | -------------------------- | -------------- | -------------- |
| AI as first-class user         | ❌ (bots are second-class) | ❌             | ✅             |
| Windowed multi-app environment | ❌                         | ✅             | ✅             |
| Real-time human+AI collab      | Limited                    | ❌             | ✅             |
| Topic-based workspaces         | Channels                   | Folders        | ✅ Contextual  |
| Agent-to-agent collaboration   | ❌                         | ❌             | ✅             |

---

## Open Questions

1. **Scope for v1** — Start minimal (chat + one app) or scaffold the full windowing system first?
2. **Agent framework** — Build our own agent orchestration, or integrate with existing frameworks (LangChain, AutoGen, CrewAI)?
3. **Real-time sync** — WebSockets for presence + CRDTs for document collaboration?
4. **Auth model** — Single user first, or multi-user from the start?
5. **Desktop feel** — How far do we go with the OS metaphor? (file system, app launcher, window management, themes?)
6. **Deployment** — Self-hosted? Cloud? Electron wrapper for native feel?

---

## Next Steps

- [x] Narrow down v1 scope → See [MVP Design](../architecture/mvp-design.md)
- [x] Finalize tech stack → See [ADR-001](../architecture/decisions.md#adr-001-tech-stack-selection)
- [x] Design data model → See [MVP Design §6](../architecture/mvp-design.md#6-data-model)
- [x] Design API → See [MVP Design §7](../architecture/mvp-design.md#7-api-design)
- [ ] Scaffold the project
- [ ] Build first prototype
- [ ] Finalize tech stack
- [ ] Create project scaffolding
- [ ] Build first prototype
