import { scryptSync } from "node:crypto";
import { MIN_SESSION_SECRET_LENGTH } from "@/lib/security/constants";

const SALT = "ark-wallet-server-v1";
const DEV_MIN_SECRET_LENGTH = 16;

export function getServerSecretKey(): Buffer {
  const secret =
    process.env.SESSION_SECRET ??
    process.env.WALLET_DATA_SECRET ??
    "";

  const minLen =
    process.env.NODE_ENV === "production"
      ? MIN_SESSION_SECRET_LENGTH
      : DEV_MIN_SECRET_LENGTH;

  if (secret.length >= minLen) {
    return scryptSync(secret, SALT, 32);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `SESSION_SECRET (min ${MIN_SESSION_SECRET_LENGTH} chars) is required in production — set in .env.local`,
    );
  }

  console.warn(
    "[ark-wallet] Using dev-only data encryption key — set SESSION_SECRET for production",
  );
  return scryptSync("ark-wallet-dev-only-key", SALT, 32);
}
