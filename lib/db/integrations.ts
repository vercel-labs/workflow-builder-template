import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { IntegrationConfig, IntegrationType } from "../types/integration";
import { db } from "./index";
import { integrations, type NewIntegration } from "./schema";

// Encryption configuration
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const ENCRYPTION_KEY_ENV = "INTEGRATION_ENCRYPTION_KEY";

/**
 * Get or generate encryption key from environment
 * Key should be a 32-byte hex string (64 characters)
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env[ENCRYPTION_KEY_ENV];

  if (!keyHex) {
    throw new Error(
      `${ENCRYPTION_KEY_ENV} environment variable is required for encrypting integration credentials`
    );
  }

  if (keyHex.length !== 64) {
    throw new Error(
      `${ENCRYPTION_KEY_ENV} must be a 64-character hex string (32 bytes)`
    );
  }

  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypt sensitive data
 * Returns a string in format: iv:authTag:encryptedData (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Return format: iv:authTag:ciphertext (all hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt encrypted data
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Encrypt integration config object
 */
function encryptConfig(config: Record<string, unknown>): string {
  return encrypt(JSON.stringify(config));
}

/**
 * Decrypt integration config object
 */
function decryptConfig(encryptedConfig: string): Record<string, unknown> {
  try {
    const decrypted = decrypt(encryptedConfig);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Failed to decrypt integration config:", error);
    return {};
  }
}

export type DecryptedIntegration = {
  id: string;
  userId: string;
  name: string;
  type: IntegrationType;
  config: IntegrationConfig;
  isManaged: boolean | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Get all integrations for a user, optionally filtered by type
 */
export async function getIntegrations(
  userId: string,
  type?: IntegrationType
): Promise<DecryptedIntegration[]> {
  const conditions = [eq(integrations.userId, userId)];

  if (type) {
    conditions.push(eq(integrations.type, type));
  }

  const results = await db
    .select()
    .from(integrations)
    .where(and(...conditions));

  return results.map((integration) => ({
    ...integration,
    config: decryptConfig(integration.config as string) as IntegrationConfig,
  }));
}

/**
 * Get a single integration by ID
 */
export async function getIntegration(
  integrationId: string,
  userId: string
): Promise<DecryptedIntegration | null> {
  const result = await db
    .select()
    .from(integrations)
    .where(
      and(eq(integrations.id, integrationId), eq(integrations.userId, userId))
    )
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return {
    ...result[0],
    config: decryptConfig(result[0].config as string) as IntegrationConfig,
  };
}

/**
 * Get a single integration by ID without user check (for system use during workflow execution)
 */
export async function getIntegrationById(
  integrationId: string
): Promise<DecryptedIntegration | null> {
  const result = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, integrationId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return {
    ...result[0],
    config: decryptConfig(result[0].config as string) as IntegrationConfig,
  };
}

/**
 * Create a new integration
 */
export async function createIntegration(
  userId: string,
  name: string,
  type: IntegrationType,
  config: IntegrationConfig
): Promise<DecryptedIntegration> {
  const encryptedConfig = encryptConfig(config);

  const [result] = await db
    .insert(integrations)
    .values({
      userId,
      name,
      type,
      config: encryptedConfig,
    })
    .returning();

  return {
    ...result,
    config,
  };
}

/**
 * Update an integration
 */
export async function updateIntegration(
  integrationId: string,
  userId: string,
  updates: {
    name?: string;
    config?: IntegrationConfig;
  }
): Promise<DecryptedIntegration | null> {
  const updateData: Partial<NewIntegration> = {
    updatedAt: new Date(),
  };

  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }

  if (updates.config !== undefined) {
    updateData.config = encryptConfig(updates.config);
  }

  const [result] = await db
    .update(integrations)
    .set(updateData)
    .where(
      and(eq(integrations.id, integrationId), eq(integrations.userId, userId))
    )
    .returning();

  if (!result) {
    return null;
  }

  return {
    ...result,
    config: decryptConfig(result.config as string) as IntegrationConfig,
  };
}

/**
 * Delete an integration
 */
export async function deleteIntegration(
  integrationId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .delete(integrations)
    .where(
      and(eq(integrations.id, integrationId), eq(integrations.userId, userId))
    )
    .returning();

  return result.length > 0;
}

/**
 * Workflow node structure for validation
 */
type WorkflowNodeForValidation = {
  data?: {
    config?: {
      integrationId?: string;
    };
  };
};

/**
 * Extract all integration IDs from workflow nodes
 */
export function extractIntegrationIds(
  nodes: WorkflowNodeForValidation[]
): string[] {
  const integrationIds: string[] = [];

  for (const node of nodes) {
    const integrationId = node.data?.config?.integrationId;
    if (integrationId && typeof integrationId === "string") {
      integrationIds.push(integrationId);
    }
  }

  return [...new Set(integrationIds)];
}

/**
 * Validate that all integration IDs in workflow nodes either:
 * 1. Belong to the specified user, or
 * 2. Don't exist (deleted integrations - stale references are allowed)
 *
 * This prevents users from accessing other users' credentials by embedding
 * foreign integration IDs in their workflows, while allowing workflows
 * with references to deleted integrations to still be saved.
 *
 * @returns Object with `valid` boolean and optional `invalidIds` array
 */
export async function validateWorkflowIntegrations(
  nodes: WorkflowNodeForValidation[],
  userId: string
): Promise<{ valid: boolean; invalidIds?: string[] }> {
  const integrationIds = extractIntegrationIds(nodes);

  if (integrationIds.length === 0) {
    return { valid: true };
  }

  // Query for ALL integrations with these IDs (regardless of user)
  // to check if any belong to other users
  const existingIntegrations = await db
    .select({ id: integrations.id, userId: integrations.userId })
    .from(integrations)
    .where(inArray(integrations.id, integrationIds));

  // Find integrations that exist but belong to a different user
  // (deleted integrations won't appear here, which is fine)
  const invalidIds = existingIntegrations
    .filter((i) => i.userId !== userId)
    .map((i) => i.id);

  if (invalidIds.length > 0) {
    return { valid: false, invalidIds };
  }

  return { valid: true };
}
