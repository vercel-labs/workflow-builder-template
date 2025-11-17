import "dotenv/config";
import { createInterface } from "node:readline";
import { sql } from "drizzle-orm";
import { db } from "../lib/db";

function dropAllTables() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<void>((resolve, reject) => {
    rl.question(
      '\n⚠️  WARNING: This will drop ALL tables and data in the database!\n\nType "DROP ALL TABLES" to confirm: ',
      async (answer) => {
        rl.close();

        if (answer !== "DROP ALL TABLES") {
          console.log("\n❌ Aborted. Database was not modified.");
          reject(new Error("User cancelled operation"));
          return;
        }

        try {
          console.log("\n🗑️  Dropping all tables...");

          // Drop all tables in reverse dependency order
          await db.execute(
            sql`DROP TABLE IF EXISTS "workflow_execution_logs" CASCADE`
          );
          console.log("  ✓ Dropped workflow_execution_logs");

          await db.execute(
            sql`DROP TABLE IF EXISTS "workflow_executions" CASCADE`
          );
          console.log("  ✓ Dropped workflow_executions");

          await db.execute(sql`DROP TABLE IF EXISTS "workflows" CASCADE`);
          console.log("  ✓ Dropped workflows");

          await db.execute(sql`DROP TABLE IF EXISTS "data_sources" CASCADE`);
          console.log("  ✓ Dropped data_sources");

          await db.execute(sql`DROP TABLE IF EXISTS "verification" CASCADE`);
          console.log("  ✓ Dropped verification");

          await db.execute(sql`DROP TABLE IF EXISTS "account" CASCADE`);
          console.log("  ✓ Dropped account");

          await db.execute(sql`DROP TABLE IF EXISTS "session" CASCADE`);
          console.log("  ✓ Dropped session");

          await db.execute(sql`DROP TABLE IF EXISTS "user" CASCADE`);
          console.log("  ✓ Dropped user");

          // Drop drizzle migration tables
          await db.execute(
            sql`DROP TABLE IF EXISTS "drizzle"."__drizzle_migrations" CASCADE`
          );
          await db.execute(sql`DROP SCHEMA IF EXISTS "drizzle" CASCADE`);
          console.log("  ✓ Dropped drizzle migration tables");

          console.log("\n✅ All tables dropped successfully!");
          console.log("\nNext steps:");
          console.log("  1. Run: pnpm db:push");
          console.log("  2. Or run: pnpm db:migrate");

          resolve();
        } catch (error) {
          console.error("\n❌ Error dropping tables:", error);
          reject(error);
        }

        process.exit(0);
      }
    );
  });
}

dropAllTables().catch((error) => {
  if (error.message !== "User cancelled operation") {
    console.error("Fatal error:", error);
  }
  process.exit(1);
});
