import { scryptSync } from "node:crypto";

const SALT = "ark-wallet-server-v1";

export function getServerSecretKey(): Buffer {
  const secret =
    process.env.SESSION_SECRET ??
    process.env.WALLET_DATA_SECRET ??
    "";

  if (secret.length >= 16) {
    return scryptSync(secret, SALT, 32);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET (min 16 chars) is required in production — set in .env.local",
    );
  }

  console.warn(
    "[ark-wallet] Using dev-only data encryption key — set SESSION_SECRET for production",
  );
  return scryptSync("ark-wallet-dev-only-key", SALT, 32);
}
