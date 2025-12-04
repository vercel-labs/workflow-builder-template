import crypto from "node:crypto";

const ENCRYPTION_KEY_ENV = process.env.WALLET_ENCRYPTION_KEY;
const ALGORITHM = "aes-256-gcm";

// Lazy initialization - only validate when actually used (not at build time)
function getEncryptionKey(): string {
  if (!ENCRYPTION_KEY_ENV || ENCRYPTION_KEY_ENV.length !== 64) {
    throw new Error(
      "WALLET_ENCRYPTION_KEY must be a 32-byte hex string (64 characters)"
    );
  }
  return ENCRYPTION_KEY_ENV;
}

/**
 * Encrypt sensitive userShare before storing in database
 * Uses AES-256-GCM for authenticated encryption
 *
 * @param userShare - The plaintext userShare from Para SDK
 * @returns Encrypted string in format: iv:authTag:encryptedData
 */
export function encryptUserShare(userShare: string): string {
  const encryptionKey = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(encryptionKey, "hex"),
    iv
  );

  let encrypted = cipher.update(userShare, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt userShare when needed for signing transactions
 *
 * @param encryptedData - Encrypted string from database
 * @returns Decrypted userShare for Para SDK
 */
export function decryptUserShare(encryptedData: string): string {
  const encryptionKey = getEncryptionKey();
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(encryptionKey, "hex"),
    iv
  );
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
