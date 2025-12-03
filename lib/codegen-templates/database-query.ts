/**
 * Code template for Database Query action step
 * This is a string template used for code generation - keep as string export
 *
 * Requires: pnpm add postgres
 * Environment: DATABASE_URL
 */
export default `export async function databaseQueryStep(input: {
  query: string;
}) {
  "use step";
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return { success: false, error: "DATABASE_URL environment variable is not set" };
  }
  
  const postgres = await import("postgres");
  const sql = postgres.default(databaseUrl, { max: 1 });
  
  try {
    const result = await sql.unsafe(input.query);
    await sql.end();
    return { success: true, rows: result, count: result.length };
  } catch (error) {
    await sql.end();
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: \`Database query failed: \${message}\` };
  }
}`;
