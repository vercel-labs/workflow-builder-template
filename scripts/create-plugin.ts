#!/usr/bin/env tsx
/**
 * Plugin Scaffolding Script
 *
 * Creates a new plugin from templates using interactive prompts.
 *
 * Usage:
 *   pnpm create-plugin
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { input } from "@inquirer/prompts";

const PLUGINS_DIR = join(process.cwd(), "plugins");
const TEMPLATE_DIR = join(PLUGINS_DIR, "_template");

// Regex patterns used for case conversions (hoisted for performance)
const LEADING_UPPERCASE_REGEX = /^[A-Z]/;

/**
 * Convert a string to various case formats
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(LEADING_UPPERCASE_REGEX, (c) => c.toLowerCase());
}

function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function toUpperSnake(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toUpperCase();
}

function toTitleCase(str: string): string {
  return str
    .replace(/[-_]+/g, " ")
    .replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
    );
}

type PluginConfig = {
  integrationName: string;
  integrationDescription: string;
  actionName: string;
  actionDescription: string;
};

/**
 * Replace all placeholders in content
 */
function replacePlaceholders(content: string, config: PluginConfig): string {
  const {
    integrationName,
    integrationDescription,
    actionName,
    actionDescription,
  } = config;

  // Integration placeholders
  const intKebab = toKebabCase(integrationName);
  const intCamel = toCamelCase(integrationName);
  const intPascal = toPascalCase(integrationName);
  const intUpperSnake = toUpperSnake(integrationName);
  const intTitle = toTitleCase(integrationName);

  // Action placeholders
  const actKebab = toKebabCase(actionName);
  const actCamel = toCamelCase(actionName);
  const actPascal = toPascalCase(actionName);
  const actUpperSnake = toUpperSnake(actionName);
  const actTitle = toTitleCase(actionName);

  return (
    content
      // Integration placeholders
      .replace(/\[integration-type\]/g, intKebab)
      .replace(/\[integration-name\]/g, intKebab)
      .replace(/\[integrationName\]/g, intCamel)
      .replace(/\[IntegrationName\]/g, intPascal)
      .replace(/\[INTEGRATION_NAME\]/g, intUpperSnake)
      .replace(/\[Integration Name\]/g, intTitle)
      .replace(
        /\[Brief description of the integration\]/g,
        integrationDescription
      )
      // Action placeholders
      .replace(/\[action-slug\]/g, actKebab)
      .replace(/\[actionName\]/g, actCamel)
      .replace(/\[ActionName\]/g, actPascal)
      .replace(/\[ACTION_NAME\]/g, actUpperSnake)
      .replace(/\[Action Name\]/g, actTitle)
      .replace(/\[Action Label\]/g, actTitle)
      .replace(/\[What this action does\]/g, actionDescription)
  );
}

/**
 * Get dynamic template files based on action name
 */
function getTemplateFiles(actionSlug: string) {
  return [
    { src: "index.ts.txt", dest: "index.ts" },
    { src: "icon.tsx.txt", dest: "icon.tsx" },
    { src: "test.ts.txt", dest: "test.ts" },
    { src: "steps/action.ts.txt", dest: `steps/${actionSlug}.ts` },
    { src: "codegen/action.ts.txt", dest: `codegen/${actionSlug}.ts` },
  ];
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log("\n🔧 Create New Plugin\n");

  // Check if template directory exists
  if (!existsSync(TEMPLATE_DIR)) {
    console.error(
      "❌ Error: Template directory not found at plugins/_template/"
    );
    console.error("   Make sure the template files are present.\n");
    process.exit(1);
  }

  // Prompt for plugin details
  const integrationName = await input({
    message: "Integration name:",
    validate: (value) => {
      if (!value.trim()) {
        return "Integration name is required";
      }
      const kebab = toKebabCase(value);
      const dir = join(PLUGINS_DIR, kebab);
      if (existsSync(dir)) {
        return `Plugin already exists at plugins/${kebab}/`;
      }
      return true;
    },
  });

  const integrationDescription = await input({
    message: "Integration description (<10 words):",
    required: true,
  });

  const actionName = await input({
    message: "Action name:",
    required: true,
  });

  const actionDescription = await input({
    message: "Action description (<10 words):",
    required: true,
  });

  const answers: PluginConfig = {
    integrationName,
    integrationDescription,
    actionName,
    actionDescription,
  };

  const pluginName = toKebabCase(integrationName);
  const actionSlug = toKebabCase(actionName);
  const pluginDir = join(PLUGINS_DIR, pluginName);

  console.log(`\n📁 Creating plugin: ${pluginName}`);

  // Create directories
  mkdirSync(join(pluginDir, "steps"), { recursive: true });
  mkdirSync(join(pluginDir, "codegen"), { recursive: true });

  // Copy and process template files
  const createdFiles: string[] = [];
  const templateFiles = getTemplateFiles(actionSlug);

  for (const { src, dest } of templateFiles) {
    const srcPath = join(TEMPLATE_DIR, src);
    const destPath = join(pluginDir, dest);

    if (!existsSync(srcPath)) {
      console.error(`\n❌ Error: Template file not found: ${src}`);
      console.error("   The template directory may be corrupted.\n");
      process.exit(1);
    }

    let content = readFileSync(srcPath, "utf-8");
    content = replacePlaceholders(content, answers);

    writeFileSync(destPath, content, "utf-8");
    createdFiles.push(`plugins/${pluginName}/${dest}`);
  }

  // Print created files
  console.log(`\n✅ Created plugin at plugins/${pluginName}/\n`);
  console.log("Files created:");
  for (const file of createdFiles) {
    console.log(`  - ${file}`);
  }

  // Run discover-plugins to register the new plugin
  console.log("\n🔍 Running plugin discovery...");
  execFileSync("pnpm", ["discover-plugins"], { stdio: "inherit" });

  console.log(
    `\n🎉 Plugin "${answers.integrationName}" has been added to the registry!\n`
  );
  console.log("Next steps:");
  console.log(`  1. Review and customize the files in plugins/${pluginName}/`);
  console.log("  2. Update the icon in icon.tsx with your integration's SVG");
  console.log("  3. Implement the API logic in steps/ and codegen/");
  console.log("  4. Test: pnpm dev\n");
}

// Handle user cancellation (Ctrl+C) gracefully
process.on("uncaughtException", (error) => {
  if (error instanceof Error && error.name === "ExitPromptError") {
    console.log("\n👋 Come back anytime to create your plugin.\n");
    process.exit(0);
  }
  throw error;
});

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("❌ Error:", message);
  process.exit(1);
});
