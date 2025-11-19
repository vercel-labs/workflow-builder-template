import { customAlphabet } from "nanoid";

// Create a nanoid generator with lowercase URL-safe characters
const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 21);

/**
 * Generate a unique lowercase ID suitable for database records and Vercel project names
 */
export function generateId(): string {
  return nanoid();
}
