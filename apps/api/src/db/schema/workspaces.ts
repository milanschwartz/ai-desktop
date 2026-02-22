import { pgTable, uuid, varchar, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { agents } from './agents';

// Workspaces table
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  defaultViewMode: varchar('default_view_mode', { length: 20 }).notNull().default('structured'),
  settings: jsonb('settings')
    .$type<{
      agentAutoParticipate: boolean;
      claimValidationRequired: boolean;
    }>()
    .notNull()
    .default({
      agentAutoParticipate: false,
      claimValidationRequired: false,
    }),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Workspace members table
export const workspaceMembers = pgTable(
  'workspace_members',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull().default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: { columns: [table.workspaceId, table.userId] },
  })
);

// Workspace agents table
export const workspaceAgents = pgTable(
  'workspace_agents',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull().default('member'),
    configOverrides: jsonb('config_overrides').$type<{
      systemPromptAddition?: string;
      autoParticipateChannels?: string[];
    }>(),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: { columns: [table.workspaceId, table.agentId] },
  })
);

// Relations
export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  creator: one(users, {
    fields: [workspaces.createdBy],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  agents: many(workspaceAgents),
  channels: many('channels'),
  canvasNodes: many('canvasNodes'),
  canvasEdges: many('canvasEdges'),
  claims: many('claims'),
  validatedFacts: many('validatedFacts'),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
}));

export const workspaceAgentsRelations = relations(workspaceAgents, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceAgents.workspaceId],
    references: [workspaces.id],
  }),
  agent: one(agents, {
    fields: [workspaceAgents.agentId],
    references: [agents.id],
  }),
}));
