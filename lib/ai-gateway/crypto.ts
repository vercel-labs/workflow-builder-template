import { EncryptJWT, jwtDecrypt } from "jose";

/**
 * Payload for encrypted AI Gateway API key
 */
export interface AiGatewayKeyPayload {
  apiKey: string;
  userId: string;
  iat: number;
}

/**
 * Get the encryption key from environment
 */
function getEncryptionKey(): Uint8Array {
  const secret = process.env.AI_GATEWAY_MANAGED_KEYS_SECRET;
  if (!secret) {
    throw new Error(
      "AI_GATEWAY_MANAGED_KEYS_SECRET environment variable is required"
    );
  }
  // Use first 32 bytes of the secret (256 bits for A256GCM)
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(secret);
  if (keyMaterial.length < 32) {
    throw new Error("Encryption secret must be at least 32 characters");
  }
  return keyMaterial.slice(0, 32);
}

/**
 * Encrypt an AI Gateway API key for storage
 */
export async function encryptAiGatewayKey(params: {
  apiKey: string;
  userId: string;
}): Promise<string> {
  const key = getEncryptionKey();
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
  const key = getEncryptionKey();

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
