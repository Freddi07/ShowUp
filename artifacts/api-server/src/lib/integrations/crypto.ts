/**
 * Symmetric encryption for integration credentials at rest (AES-256-GCM).
 *
 * The key comes from the ENCRYPTION_KEY secret. Stored values are formatted as
 * "<iv>:<authTag>:<ciphertext>" (all hex). Ported from the previous frontend
 * scaffolding; it is the only place credentials are (de)serialised, so provider
 * tokens/webhook secrets are never persisted or logged in clear text.
 */
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

/** Returns the 32-byte key, throwing a clear error if the secret is missing. */
function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Add it as a Replit Secret to store " +
        "integration credentials.",
    );
  }
  return Buffer.from(key.padEnd(32, "0").slice(0, 32), "utf8");
}

export function encrypt(value: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(value, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(encrypted: string): string {
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value format");
  }
  const [ivHex, authTagHex, encryptedData] = parts;
  if (!ivHex || !authTagHex || !encryptedData) {
    throw new Error("Invalid encrypted value format");
  }
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function encryptJSON(value: unknown): string {
  return encrypt(JSON.stringify(value));
}

export function decryptJSON<T>(encrypted: string): T {
  if (!encrypted) return {} as T;
  return JSON.parse(decrypt(encrypted)) as T;
}

/** True when ENCRYPTION_KEY is configured (for surfacing setup state). */
export function isEncryptionConfigured(): boolean {
  return Boolean(process.env.ENCRYPTION_KEY);
}
