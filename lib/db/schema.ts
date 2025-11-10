import { relations } from "drizzle-orm";
import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { customAlphabet } from "nanoid";

// Create a nanoid generator with URL-safe characters
const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  21
);

// Better Auth tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  // Anonymous user tracking
  isAnonymous: boolean("isAnonymous").default(false),
  // User-level integrations (Vercel is now app-level)
  resendApiKey: text("resend_api_key"),
  resendFromEmail: text("resend_from_email"),
  linearApiKey: text("linear_api_key"),
  slackApiKey: text("slack_api_key"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

// Projects table
export const projects = pgTable("projects", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  vercelProjectId: text("vercel_project_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Workflows table with user association
export const workflows = pgTable("workflows", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  description: text("description"),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  vercelProjectId: text("vercel_project_id").references(
    () => projects.id
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodes: jsonb("nodes").notNull().$type<Array<any>>(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  edges: jsonb("edges").notNull().$type<Array<any>>(),
  deploymentStatus: text("deployment_status")
    .$type<"none" | "pending" | "deploying" | "deployed" | "failed">()
    .default("none"),
  deploymentUrl: text("deployment_url"),
  lastDeployedAt: timestamp("last_deployed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Workflow executions table to track workflow runs
export const workflowExecutions = pgTable("workflow_executions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  workflowId: text("workflow_id")
    .notNull()
    .references(() => workflows.id),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  status: text("status")
    .notNull()
    .$type<"pending" | "running" | "success" | "error" | "cancelled">(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: jsonb("input").$type<Record<string, any>>(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: jsonb("output").$type<any>(),
  error: text("error"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: text("duration"), // Duration in milliseconds
});

// Workflow execution logs to track individual node executions
export const workflowExecutionLogs = pgTable("workflow_execution_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  executionId: text("execution_id")
    .notNull()
    .references(() => workflowExecutions.id),
  nodeId: text("node_id").notNull(),
  nodeName: text("node_name").notNull(),
  nodeType: text("node_type").notNull(),
  status: text("status")
    .notNull()
    .$type<"pending" | "running" | "success" | "error">(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: jsonb("input").$type<any>(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: jsonb("output").$type<any>(),
  error: text("error"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: text("duration"), // Duration in milliseconds
});

// Data sources table for user-configured database connections
export const dataSources = pgTable("data_sources", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  name: text("name").notNull(),
  type: text("type").notNull().$type<"postgresql" | "mysql" | "mongodb">(),
  connectionString: text("connection_string").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const workflowsRelations = relations(workflows, ({ one }) => ({
  vercelProject: one(projects, {
    fields: [workflows.vercelProjectId],
    references: [projects.id],
  }),
}));

export const projectsRelations = relations(
  projects,
  ({ many }) => ({
    workflows: many(workflows),
  })
);

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type NewWorkflowExecution = typeof workflowExecutions.$inferInsert;
export type WorkflowExecutionLog = typeof workflowExecutionLogs.$inferSelect;
export type NewWorkflowExecutionLog = typeof workflowExecutionLogs.$inferInsert;
export type DataSource = typeof dataSources.$inferSelect;
export type NewDataSource = typeof dataSources.$inferInsert;
