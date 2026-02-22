# Claim Validation & Trust System

**Date:** 2026-02-22  
**Status:** Draft  
**Related ADR:** ADR-006

---

## 1. Overview

The Claim Validation System is the **core differentiator** of AI Desktop. It transforms AI-generated content from "take it or leave it" into a **structured knowledge pipeline** where every claim can be traced, verified, and remembered.

### The Problem

AI agents generate text that mixes facts, inferences, and hallucinations. Users currently have no ergonomic way to:

- Identify which parts of a response are verifiable claims
- Check the sources behind those claims
- Build a trusted knowledge base from validated information
- Avoid re-validating things they've already confirmed

### The Solution

A multi-layered validation system that:

1. **Parses** agent responses into discrete claims
2. **Links** claims to their sources (when available)
3. **Surfaces** validation UI inline and in a dedicated Zen Mode
4. **Remembers** validated facts in a workspace knowledge base
5. **Reuses** validated facts to reduce future hallucination and re-validation

---

## 2. Core Concepts

### 2.1 Claims

A **claim** is an atomic, verifiable statement extracted from an agent's response.

```
Agent response:
"PostgreSQL supports JSONB columns, which were introduced in version 9.4.
It's generally faster than MongoDB for structured queries."

Extracted claims:
  ├── Claim 1: "PostgreSQL supports JSONB columns" [verifiable]
  ├── Claim 2: "JSONB was introduced in PostgreSQL 9.4" [verifiable]
  └── Claim 3: "PostgreSQL is generally faster than MongoDB for structured queries" [comparative, needs context]
```

**Claim properties:**
| Property | Description |
|----------|-------------|
| `id` | Unique identifier |
| `message_id` | Source message |
| `content` | The claim text |
| `text_range` | Start/end position in the original message |
| `claim_type` | `factual`, `comparative`, `opinion`, `inference` |
| `confidence` | Agent's self-assessed confidence (if available) |
| `status` | `unvalidated`, `approved`, `denied`, `needs_info` |
| `sources` | References supporting the claim |
| `validated_by` | User who validated |
| `validated_at` | Timestamp |

### 2.2 Sources

A **source** is evidence supporting or contradicting a claim.

**Source types:**
| Type | Description | Example |
|------|-------------|---------|
| `citation` | URL/reference provided by the agent | "According to postgresql.org/docs..." |
| `workspace_document` | Document in the workspace | An uploaded PDF or note |
| `workspace_message` | Previous message in workspace | A human expert's earlier statement |
| `web_search` | Result from web search | Search result snippet + URL |
| `validated_fact` | Previously validated claim | A fact from the knowledge base |

### 2.3 Knowledge Base (Validated Facts)

When a claim is **approved**, it becomes a **validated fact** in the workspace knowledge base. These facts:

- Are **reused by agents** as trusted context (injected into system prompts)
- Are **never re-validated** — they show a ✅ badge inline
- Can be **revoked** if later found incorrect
- Are **searchable** across the workspace
- Have a **provenance chain** (who validated, when, based on what source)

```
Knowledge Base
├── Fact: "PostgreSQL supports JSONB columns" ✅
│   ├── Validated by: Milan, 2026-02-22
│   ├── Source: postgresql.org/docs/16/datatype-json.html
│   └── Used in: 3 agent responses (auto-trusted)
├── Fact: "JSONB was introduced in PostgreSQL 9.4" ✅
│   └── ...
└── Denied: "PostgreSQL is faster than MongoDB for all queries" ❌
    ├── Denied by: Milan, 2026-02-22
    ├── Reason: "Only true for structured queries, not document lookups"
    └── Correction: "PostgreSQL is faster for structured/relational queries"
```

---

## 3. User Interactions

### 3.1 Inline Claim Indicators

In any message from an agent, claims are **subtly highlighted** with a dotted underline (like a hyperlink, but distinct).

```
┌──────────────────────────────────────────────────────┐
│ 🤖 ResearchBot                                       │
│                                                       │
│ PostgreSQL supports JSONB columns, which were         │
│ ·······································               │
│ introduced in version 9.4. It's generally faster      │
│ ·····························  ·····················  │
│ than MongoDB for structured queries.                  │
│ ····································                  │
│                                                       │
│ ┌─ 3 claims │ 0 validated │ [Validate All →] ┐       │
└──────────────────────────────────────────────────────┘
```

**Claim states (visual):**
| State | Indicator | Color |
|-------|-----------|-------|
| Unvalidated | Dotted underline | Gray |
| Approved | Solid underline + ✅ | Green |
| Denied | Strikethrough + ❌ | Red |
| Needs Info | Dashed underline + ❓ | Amber |

### 3.2 Hover Preview

When a user **hovers** over a claim for ~500ms (long hover), a **source preview popover** appears:

```
┌──────────────────────────────────────────────┐
│ 📋 Claim: "JSONB was introduced in v9.4"     │
│                                               │
│ 📎 Source: postgresql.org/docs/16/release-9-4 │
│ ┌──────────────────────────────────────────┐  │
│ │ "Release 9.4 added support for JSONB,    │  │
│ │  a binary JSON data type..."             │  │
│ └──────────────────────────────────────────┘  │
│                                               │
│ [✅ Approve]  [❌ Deny]  [❓ Need More Info]  │
└──────────────────────────────────────────────┘
```

If no source is available:

```
┌──────────────────────────────────────────────┐
│ 📋 Claim: "PostgreSQL is faster than MongoDB" │
│                                               │
│ ⚠️ No source provided by agent                │
│                                               │
│ [🔍 Search workspace] [🌐 Web search]        │
│                                               │
│ [✅ Approve]  [❌ Deny]  [❓ Need More Info]  │
└──────────────────────────────────────────────┘
```

### 3.3 Zen Mode (Sequential Validation)

A **distraction-free, full-screen validation mode** for reviewing claims one at a time.

**Entry points:**

- "Validate All" button on a message
- "Review unvalidated claims" from workspace menu
- Keyboard shortcut (e.g., `Ctrl+Shift+V`)

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│                    ZEN MODE                               │
│              Validating claims (2 of 7)                  │
│              ████████░░░░░░░░░░░░░░░░░░                  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │  "JSONB was introduced in PostgreSQL 9.4"          │  │
│  │                                                    │  │
│  │  Type: Factual                                     │  │
│  │  Agent: ResearchBot (Claude 3.5 Sonnet)            │  │
│  │  Context: Discussion about database options        │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Sources ──────────────────────────────────────────┐  │
│  │                                                    │  │
│  │  📎 Agent citation:                                │  │
│  │  postgresql.org/docs/16/release-9-4.html           │  │
│  │  "Release 9.4 added support for JSONB..."          │  │
│  │                                                    │  │
│  │  📄 Workspace document:                            │  │
│  │  "database-comparison.md" — mentions JSONB 9.4     │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│                                                          │
│   ┌──────────┐   ┌──────────┐   ┌────────────────────┐  │
│   │ ✅ Approve│   │ ❌ Deny  │   │ ❓ Need More Info  │  │
│   │   (A)     │   │   (D)    │   │       (I)          │  │
│   └──────────┘   └──────────┘   └────────────────────┘  │
│                                                          │
│   [← Previous]                          [Skip →]  [Esc] │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Zen Mode features:**

- **Minimal UI** — just the claim, sources, and action buttons
- **Keyboard-driven** — `A` = Approve, `D` = Deny, `I` = Need Info, `→` = Skip, `Esc` = Exit
- **Progress bar** — shows how many claims remain
- **Context snippet** — shows the surrounding conversation for context
- **Auto-advance** — moves to next claim after action
- **Deny with reason** — optional text field for why it's wrong + correction

### 3.4 "Need More Info" Flow

When a user clicks **Need More Info**, the system searches for supporting evidence:

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  ❓ Finding more information...                          │
│                                                          │
│  Claim: "PostgreSQL is faster than MongoDB for           │
│          structured queries"                             │
│                                                          │
│  ┌─ Search Results ───────────────────────────────────┐  │
│  │                                                    │  │
│  │  📄 Workspace: database-comparison.md              │  │
│  │  "Benchmark results show PostgreSQL outperforms    │  │
│  │   MongoDB by 3x on JOIN-heavy queries..."          │  │
│  │  [Use as source]                                   │  │
│  │                                                    │  │
│  │  💬 Workspace chat: #research, Feb 20              │  │
│  │  Alex: "I ran benchmarks and PG was faster for     │  │
│  │  anything with relations"                          │  │
│  │  [Use as source]                                   │  │
│  │                                                    │  │
│  │  🌐 Web: benchmarks.postgresql.org                 │  │
│  │  "TPC-H benchmark results comparing PostgreSQL..." │  │
│  │  [Use as source]                                   │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ 🔍 Custom search: _____________________________ │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│   [✅ Approve with sources]  [❌ Still Deny]  [Skip →]   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Search priority:**

1. **Workspace documents** — files uploaded to the workspace
2. **Workspace messages** — previous conversations (human expert statements carry weight)
3. **Knowledge base** — previously validated facts
4. **Web search** — external sources (via agent or search API)

---

## 4. Agent Integration

### 4.1 Claim Extraction

When an agent responds, the system extracts claims. Two approaches (can be combined):

**Approach A: Agent self-annotation (preferred)**

- Include instructions in the agent's system prompt to annotate claims
- Agent wraps claims in special markers: `[claim: "text" | source: "url"]`
- Parsed by the backend before storing

**Approach B: Post-processing extraction**

- A secondary LLM call analyzes the response
- Extracts claims, classifies them, and identifies any inline citations
- More expensive but works with any model

**Recommended: Approach A with Approach B as fallback** for agents that don't follow the annotation format.

### 4.2 Knowledge Base Injection

When an agent is about to respond, the system:

1. Retrieves **validated facts** relevant to the conversation topic
2. Injects them into the agent's context as trusted information
3. Instructs the agent: "The following facts have been verified by the user. Use them as ground truth."

This creates a **feedback loop**: validate → remember → reuse → less hallucination → less validation needed.

```
System prompt injection:
───────────────────────
The following facts have been validated by the workspace team.
Treat them as ground truth — do not contradict them unless you
have strong evidence and explicitly flag the contradiction.

VALIDATED FACTS:
- PostgreSQL supports JSONB columns (since v9.4)
- The project uses Fastify, not Express
- Target deployment is AWS ECS
───────────────────────
```

### 4.3 Claim Density Scoring

Over time, the system tracks **claim density** per agent and model:

- How many claims per response?
- What % get approved vs denied?
- Which models produce more verifiable claims?

This helps users choose better models and tune agent prompts.

---

## 5. Data Model Additions

### `claims`

| Column        | Type              | Description                                       |
| ------------- | ----------------- | ------------------------------------------------- |
| id            | UUID              | Primary key                                       |
| message_id    | UUID → messages   | Source message                                    |
| workspace_id  | UUID → workspaces | For knowledge base scoping                        |
| content       | TEXT              | The claim text                                    |
| text_start    | INTEGER           | Start offset in message content                   |
| text_end      | INTEGER           | End offset in message content                     |
| claim_type    | ENUM              | 'factual', 'comparative', 'opinion', 'inference'  |
| status        | ENUM              | 'unvalidated', 'approved', 'denied', 'needs_info' |
| confidence    | FLOAT             | Agent's self-assessed confidence (0-1)            |
| denial_reason | TEXT              | Why it was denied (optional)                      |
| correction    | TEXT              | Corrected version (optional)                      |
| validated_by  | UUID → users      | Who validated                                     |
| validated_at  | TIMESTAMP         | When validated                                    |
| created_at    | TIMESTAMP         |                                                   |

### `claim_sources`

| Column          | Type          | Description                                                                           |
| --------------- | ------------- | ------------------------------------------------------------------------------------- |
| id              | UUID          | Primary key                                                                           |
| claim_id        | UUID → claims |                                                                                       |
| source_type     | ENUM          | 'citation', 'workspace_document', 'workspace_message', 'web_search', 'validated_fact' |
| title           | VARCHAR(255)  | Source title/label                                                                    |
| url             | TEXT          | External URL (if applicable)                                                          |
| content_snippet | TEXT          | Relevant excerpt from source                                                          |
| reference_id    | UUID          | ID of workspace doc/message/fact (if internal)                                        |
| created_at      | TIMESTAMP     |                                                                                       |

### `validated_facts`

| Column         | Type              | Description             |
| -------------- | ----------------- | ----------------------- |
| id             | UUID              | Primary key             |
| workspace_id   | UUID → workspaces | Scoped to workspace     |
| claim_id       | UUID → claims     | Original claim          |
| content        | TEXT              | The validated fact text |
| category       | VARCHAR(100)      | Topic/category tag      |
| is_active      | BOOLEAN           | Can be revoked          |
| revoked_at     | TIMESTAMP         | If revoked              |
| revoked_reason | TEXT              | Why revoked             |
| created_at     | TIMESTAMP         |                         |

### `user_validation_preferences`

| Column                    | Type         | Description                               |
| ------------------------- | ------------ | ----------------------------------------- |
| id                        | UUID         | Primary key                               |
| user_id                   | UUID → users |                                           |
| auto_approve_threshold    | FLOAT        | Auto-approve claims above this confidence |
| zen_mode_shortcuts        | JSONB        | Custom keyboard shortcuts                 |
| claim_highlight_style     | ENUM         | 'subtle', 'prominent', 'off'              |
| auto_search_on_needs_info | BOOLEAN      | Auto-trigger search                       |
| created_at                | TIMESTAMP    |                                           |
| updated_at                | TIMESTAMP    |                                           |

---

## 6. API Endpoints

### Claims

| Method | Endpoint                        | Description                                     |
| ------ | ------------------------------- | ----------------------------------------------- |
| GET    | `/messages/:id/claims`          | Get claims for a message                        |
| GET    | `/workspaces/:id/claims`        | List claims in workspace (filterable by status) |
| PATCH  | `/claims/:id`                   | Update claim status (approve/deny/needs_info)   |
| POST   | `/claims/:id/sources`           | Add a source to a claim                         |
| DELETE | `/claims/:id/sources/:sourceId` | Remove a source                                 |

### Knowledge Base

| Method | Endpoint                       | Description             |
| ------ | ------------------------------ | ----------------------- |
| GET    | `/workspaces/:id/facts`        | List validated facts    |
| GET    | `/workspaces/:id/facts/search` | Search facts by keyword |
| DELETE | `/facts/:id`                   | Revoke a validated fact |
| GET    | `/workspaces/:id/facts/stats`  | Validation statistics   |

### Validation Support

| Method | Endpoint                         | Description                                  |
| ------ | -------------------------------- | -------------------------------------------- |
| POST   | `/claims/:id/search`             | Search for supporting info (workspace + web) |
| GET    | `/workspaces/:id/claims/pending` | Get unvalidated claims for Zen Mode          |

### WebSocket Events

| Event             | Direction       | Description                          |
| ----------------- | --------------- | ------------------------------------ |
| `claim_validated` | Server → Client | A claim was approved/denied          |
| `fact_added`      | Server → Client | New validated fact in knowledge base |
| `fact_revoked`    | Server → Client | A fact was revoked                   |

---

## 7. User Preference Learning

The system learns user preferences over time:

### 7.1 Implicit Signals

- **Claims the user always approves** → suggest auto-approve for similar claims
- **Claims the user always denies from a specific model** → flag that model's reliability
- **Topics the user validates quickly** → they're an expert, weight their validations higher
- **Time spent on hover** → indicates interest/concern level

### 7.2 Explicit Preferences

- **Auto-approve threshold** — if agent confidence > X%, auto-approve
- **Trusted sources** — always trust claims from certain URLs/documents
- **Claim highlight intensity** — subtle vs prominent vs off
- **Validation reminders** — notify when unvalidated claims exceed a threshold

### 7.3 Workspace-Level Learning

- Facts validated by **multiple users** get higher trust scores
- **Expert domains** — if a user is tagged as a domain expert, their validations carry more weight
- **Contradiction detection** — alert when a new claim contradicts a validated fact

---

## 8. Implementation Priority

This feature is complex. Here's the recommended build order:

### Tier 1: Foundation (build with MVP)

- [ ] Claim extraction (agent self-annotation via system prompt)
- [ ] Claims table + basic API
- [ ] Inline claim highlighting (dotted underline)
- [ ] Hover popover with approve/deny/needs-info
- [ ] Validated facts table

### Tier 2: Zen Mode (shortly after MVP)

- [ ] Zen Mode UI (full-screen sequential validation)
- [ ] Keyboard shortcuts
- [ ] Progress tracking
- [ ] Deny with reason + correction

### Tier 3: Knowledge Reuse (iterative)

- [ ] Knowledge base injection into agent prompts
- [ ] "Need More Info" search flow (workspace → web)
- [ ] Fact search API
- [ ] Claim density scoring

### Tier 4: Learning (post-MVP)

- [ ] User preference learning
- [ ] Auto-approve suggestions
- [ ] Contradiction detection
- [ ] Multi-user validation weighting
