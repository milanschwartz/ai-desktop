import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  real,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { workspaces } from './workspaces';
import { messages } from './messages';

// Claims table
export const claims = pgTable('claims', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  textStart: integer('text_start').notNull(),
  textEnd: integer('text_end').notNull(),
  claimType: varchar('claim_type', { length: 20 }).notNull().default('factual'),
  status: varchar('status', { length: 20 }).notNull().default('unvalidated'),
  confidence: real('confidence'),
  denialReason: text('denial_reason'),
  correction: text('correction'),
  validatedBy: uuid('validated_by').references(() => users.id, { onDelete: 'set null' }),
  validatedAt: timestamp('validated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Claim sources table
export const claimSources = pgTable('claim_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  claimId: uuid('claim_id')
    .notNull()
    .references(() => claims.id, { onDelete: 'cascade' }),
  sourceType: varchar('source_type', { length: 30 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  url: text('url'),
  contentSnippet: text('content_snippet'),
  referenceId: uuid('reference_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Validated facts table
export const validatedFacts = pgTable('validated_facts', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  claimId: uuid('claim_id')
    .notNull()
    .references(() => claims.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  category: varchar('category', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokedReason: text('revoked_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Relations
export const claimsRelations = relations(claims, ({ one, many }) => ({
  message: one(messages, {
    fields: [claims.messageId],
    references: [messages.id],
  }),
  workspace: one(workspaces, {
    fields: [claims.workspaceId],
    references: [workspaces.id],
  }),
  validator: one(users, {
    fields: [claims.validatedBy],
    references: [users.id],
  }),
  sources: many(claimSources),
  validatedFact: one(validatedFacts, {
    fields: [claims.id],
    references: [validatedFacts.claimId],
  }),
}));

export const claimSourcesRelations = relations(claimSources, ({ one }) => ({
  claim: one(claims, {
    fields: [claimSources.claimId],
    references: [claims.id],
  }),
}));

export const validatedFactsRelations = relations(validatedFacts, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [validatedFacts.workspaceId],
    references: [workspaces.id],
  }),
  claim: one(claims, {
    fields: [validatedFacts.claimId],
    references: [claims.id],
  }),
}));
