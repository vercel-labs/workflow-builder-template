import "server-only";
import { sql } from "drizzle-orm";
import { db } from "../db";

export type DatabaseQueryParams = {
  query: string;
  params?: unknown[];
};

export type DatabaseQueryResult = {
  status: "success" | "error";
  data?: unknown;
  rowCount?: number;
  error?: string;
};

/**
 * Execute a raw SQL query
 */
export async function executeQuery(
  params: DatabaseQueryParams
): Promise<DatabaseQueryResult> {
  try {
    // Validate query exists
    if (!params.query || params.query.trim() === "") {
      return {
        status: "error",
        error: "Query is required",
      };
    }

    // Execute the raw SQL query
    const result = await db.execute(sql.raw(params.query));

    return {
      status: "success",
      data: result,
      rowCount: Array.isArray(result) ? result.length : 0,
    };
  } catch (error) {
    console.error("Database query error:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Insert data into a table
 */
export async function insertData(
  tableName: string,
  data: Record<string, unknown>
): Promise<DatabaseQueryResult> {
  try {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

    const query = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders}) RETURNING *`;

    const result = await db.execute(sql.raw(query));

    return {
      status: "success",
      data: Array.isArray(result) && result.length > 0 ? result[0] : result,
      rowCount: 1,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Query data from a table
 */
export async function queryData(
  tableName: string,
  where?: Record<string, unknown>,
  limit?: number
): Promise<DatabaseQueryResult> {
  try {
    let query = `SELECT * FROM ${tableName}`;

    if (where && Object.keys(where).length > 0) {
      const conditions = Object.keys(where)
        .map((key, i) => `${key} = $${i + 1}`)
        .join(" AND ");
      query += ` WHERE ${conditions}`;
    }

    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    const result = await db.execute(sql.raw(query));

    return {
      status: "success",
      data: result,
      rowCount: Array.isArray(result) ? result.length : 0,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update data in a table
 */
export async function updateData(
  tableName: string,
  data: Record<string, unknown>,
  where: Record<string, unknown>
): Promise<DatabaseQueryResult> {
  try {
    const setColumns = Object.keys(data);
    const whereColumns = Object.keys(where);

    const setClause = setColumns
      .map((col, i) => `${col} = $${i + 1}`)
      .join(", ");
    const whereClause = whereColumns
      .map((col, i) => `${col} = $${setColumns.length + i + 1}`)
      .join(" AND ");

    const query = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause} RETURNING *`;

    const result = await db.execute(sql.raw(query));

    return {
      status: "success",
      data: result,
      rowCount: Array.isArray(result) ? result.length : 0,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
