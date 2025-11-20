/**
 * Executable step function for Database Query action
 */
import "server-only";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

type DatabaseQueryInput = {
  dbQuery?: string;
  query?: string;
  databaseUrl?: string;
};

type DatabaseQueryResult = {
  status: string;
  rows?: unknown;
  count?: number;
  error?: string;
};

function validateInput(input: DatabaseQueryInput): string | null {
  const queryString = input.dbQuery || input.query;

  if (!queryString || queryString.trim() === "") {
    return "SQL query is required";
  }

  if (!input.databaseUrl || input.databaseUrl.trim() === "") {
    return "Database URL is required. Please configure it in Project Integrations.";
  }

  return null;
}

function createDatabaseClient(databaseUrl: string): postgres.Sql {
  return postgres(databaseUrl, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 20,
  });
}

async function executeQuery(
  client: postgres.Sql,
  queryString: string
): Promise<unknown> {
  const db = drizzle(client);
  return await db.execute(sql.raw(queryString));
}

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Unknown database error";
  }

  const errorMessage = error.message;

  if (errorMessage.includes("ECONNREFUSED")) {
    return "Connection refused. Please check your database URL and ensure the database is running.";
  }
  if (errorMessage.includes("ENOTFOUND")) {
    return "Database host not found. Please check your database URL.";
  }
  if (errorMessage.includes("authentication failed")) {
    return "Authentication failed. Please check your database credentials.";
  }
  if (errorMessage.includes("does not exist")) {
    return `Database error: ${errorMessage}`;
  }

  return errorMessage;
}

async function cleanupClient(client: postgres.Sql | null): Promise<void> {
  if (client) {
    try {
      await client.end();
    } catch {
      // Ignore errors during cleanup
    }
  }
}

export async function databaseQueryStep(
  input: DatabaseQueryInput
): Promise<DatabaseQueryResult> {
  "use step";

  const validationError = validateInput(input);
  if (validationError) {
    return {
      status: "error",
      error: validationError,
    };
  }

  // At this point, validation ensures these are defined
  const queryString = (input.dbQuery || input.query) as string;
  const databaseUrl = input.databaseUrl as string;
  let client: postgres.Sql | null = null;

  try {
    client = createDatabaseClient(databaseUrl);
    const result = await executeQuery(client, queryString);
    await client.end();

    return {
      status: "success",
      rows: result,
      count: Array.isArray(result) ? result.length : 0,
    };
  } catch (error) {
    await cleanupClient(client);
    return {
      status: "error",
      error: getErrorMessage(error),
    };
  }
}
