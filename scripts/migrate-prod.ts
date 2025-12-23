import { execSync } from "child_process";

const VERCEL_ENV = process.env.VERCEL_ENV;

if (VERCEL_ENV === "production") {
  console.log("Running database migrations for production...");
  try {
    execSync("pnpm db:migrate", { stdio: "inherit" });
    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
} else {
  console.log(`Skipping migrations (VERCEL_ENV=${VERCEL_ENV ?? "not set"})`);
}
