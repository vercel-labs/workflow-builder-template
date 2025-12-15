import { hkdf } from "node:crypto";
import { promisify } from "node:util";
import { EncryptJWT, jwtDecrypt } from "jose";

const hkdfAsync = promisify(hkdf);

// HKDF parameters for key derivation
const HKDF_HASH = "sha256";
const HKDF_SALT = "ai-gateway-managed-keys-v1";
const HKDF_INFO = "jwe-encryption-key";
const KEY_LENGTH = 32; // 256 bits for A256GCM

/**
 * Payload for encrypted AI Gateway API key
 */
export interface AiGatewayKeyPayload {
  apiKey: string;
  userId: string;
  iat: number;
}

// Cache the derived key to avoid repeated HKDF calls
let cachedKey: Uint8Array | null = null;
let cachedSecretHash: string | null = null;

/**
 * Derive encryption key from secret using HKDF
 * Uses SHA-256 with a fixed salt and info string for domain separation
 */
async function getEncryptionKey(): Promise<Uint8Array> {
  const secret = process.env.AI_GATEWAY_MANAGED_KEYS_SECRET;
  if (!secret) {
    throw new Error(
      "AI_GATEWAY_MANAGED_KEYS_SECRET environment variable is required"
    );
  }

  if (secret.length < 16) {
    throw new Error("Encryption secret must be at least 16 characters");
  }

  // Simple hash to check if secret changed (for cache invalidation)
  const secretHash = Buffer.from(secret).toString("base64").slice(0, 16);

  // Return cached key if secret hasn't changed
  if (cachedKey && cachedSecretHash === secretHash) {
    return cachedKey;
  }

  // Derive key using HKDF
  const derivedKey = await hkdfAsync(
    HKDF_HASH,
    secret,
    HKDF_SALT,
    HKDF_INFO,
    KEY_LENGTH
  );

  cachedKey = new Uint8Array(derivedKey);
  cachedSecretHash = secretHash;

  return cachedKey;
}

/**
 * Encrypt an AI Gateway API key for storage
 */
export async function encryptAiGatewayKey(params: {
  apiKey: string;
  userId: string;
}): Promise<string> {
  const key = await getEncryptionKey();
  const now = Math.floor(Date.now() / 1000);

  // No expiration - keys are stored indefinitely until user revokes
  const jwe = await new EncryptJWT({
    apiKey: params.apiKey,
    userId: params.userId,
    iat: now,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt(now)
    .encrypt(key);

  return jwe;
}

/**
 * Decrypt an AI Gateway API key from storage
 */
export async function decryptAiGatewayKey(
  jwe: string
): Promise<AiGatewayKeyPayload> {
  const key = await getEncryptionKey();

  try {
    const { payload } = await jwtDecrypt(jwe, key);

    // Validate required fields
    if (
      typeof payload.apiKey !== "string" ||
      typeof payload.userId !== "string"
    ) {
      throw new Error("Invalid JWE payload: missing required fields");
    }

    return {
      apiKey: payload.apiKey,
      userId: payload.userId,
      iat: (payload.iat as number) || Math.floor(Date.now() / 1000),
    };
  } catch (e) {
    if (e instanceof Error) {
      throw new Error(`AI Gateway key decryption failed: ${e.message}`);
    }
    throw new Error("AI Gateway key decryption failed");
  }
}
