import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  account,
  projects,
  projectsRelations,
  session,
  user,
  verification,
  workflowExecutionLogs,
  workflowExecutions,
  workflowExecutionsRelations,
  workflows,
  workflowsRelations,
} from "./schema";

// Construct schema object for drizzle
const schema = {
  user,
  session,
  account,
  verification,
  workflows,
  projects,
  workflowExecutions,
  workflowExecutionLogs,
  workflowsRelations,
  projectsRelations,
  workflowExecutionsRelations,
};

const connectionString =
  process.env.DATABASE_URL || "postgres://localhost:5432/workflow";

// For migrations
export const migrationClient = postgres(connectionString, { max: 1 });

// For queries
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });
