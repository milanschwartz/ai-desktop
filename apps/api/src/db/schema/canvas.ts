import { pgTable, uuid, varchar, text, jsonb, timestamp, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { workspaces } from './workspaces';

// Canvas nodes table
export const canvasNodes = pgTable('canvas_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  parentNodeId: uuid('parent_node_id').references((): typeof canvasNodes => canvasNodes, {
    onDelete: 'set null',
  }),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  positionX: real('position_x').notNull().default(0),
  positionY: real('position_y').notNull().default(0),
  width: real('width').notNull().default(200),
  height: real('height').notNull().default(150),
  style: jsonb('style')
    .$type<{
      color?: string;
      shape?: 'rectangle' | 'rounded' | 'circle';
    }>()
    .notNull()
    .default({}),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Canvas edges table
export const canvasEdges = pgTable('canvas_edges', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  sourceNodeId: uuid('source_node_id')
    .notNull()
    .references(() => canvasNodes, { onDelete: 'cascade' }),
  targetNodeId: uuid('target_node_id')
    .notNull()
    .references(() => canvasNodes, { onDelete: 'cascade' }),
  label: varchar('label', { length: 100 }),
  style: jsonb('style')
    .$type<{
      color?: string;
      style?: 'solid' | 'dashed' | 'dotted';
    }>()
    .notNull()
    .default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Relations
export const canvasNodesRelations = relations(canvasNodes, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [canvasNodes.workspaceId],
    references: [workspaces.id],
  }),
  parent: one(canvasNodes, {
    fields: [canvasNodes.parentNodeId],
    references: [canvasNodes.id],
    relationName: 'nodeHierarchy',
  }),
  children: many(canvasNodes, { relationName: 'nodeHierarchy' }),
  creator: one(users, {
    fields: [canvasNodes.createdBy],
    references: [users.id],
  }),
  outgoingEdges: many(canvasEdges, { relationName: 'sourceNode' }),
  incomingEdges: many(canvasEdges, { relationName: 'targetNode' }),
  messages: many('messages'),
}));

export const canvasEdgesRelations = relations(canvasEdges, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [canvasEdges.workspaceId],
    references: [workspaces.id],
  }),
  sourceNode: one(canvasNodes, {
    fields: [canvasEdges.sourceNodeId],
    references: [canvasNodes.id],
    relationName: 'sourceNode',
  }),
  targetNode: one(canvasNodes, {
    fields: [canvasEdges.targetNodeId],
    references: [canvasNodes.id],
    relationName: 'targetNode',
  }),
}));
