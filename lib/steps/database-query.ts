/**
 * Executable step function for Database Query action
 */
import { executeQuery } from "../integrations/database";

export async function databaseQueryStep(input: {
  dbQuery?: string;
  query?: string;
  databaseUrl?: string;
}): Promise<{
  status: string;
  data?: unknown;
  rowCount?: number;
  error?: string;
}> {
  // Accept either dbQuery or query field name
  const queryString = input.dbQuery || input.query;

  console.log("Database query:", queryString);

  if (!queryString || queryString.trim() === "") {
    return {
      status: "error",
      error: "SQL query is required",
    };
  }

  try {
    // Execute the query using our database integration
    const result = await executeQuery({
      query: queryString,
    });

    console.log("Query result:", result.status, "rows:", result.rowCount);

    return result;
  } catch (error) {
    console.error("Database query error:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}
