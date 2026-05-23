import fs from "fs";
import path from "path";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { withFileLockSync } from "./file-lock";
import { getServerSecretKey } from "./server-secret";

interface EncryptedEnvelope {
  v: 1;
  iv: string;
  data: string;
  tag: string;
}

function encryptJson(payload: unknown): EncryptedEnvelope {
  const key = getServerSecretKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plain = Buffer.from(JSON.stringify(payload), "utf8");
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    iv: iv.toString("base64"),
    data: enc.toString("base64"),
    tag: tag.toString("base64"),
  };
}

function decryptJson<T>(envelope: EncryptedEnvelope): T {
  const key = getServerSecretKey();
  const iv = Buffer.from(envelope.iv, "base64");
  const data = Buffer.from(envelope.data, "base64");
  const tag = Buffer.from(envelope.tag, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(plain.toString("utf8")) as T;
}

function readEncryptedFileUnlocked<T>(
  encPath: string,
  legacyPath: string,
  empty: T,
): T {
  if (fs.existsSync(encPath)) {
    try {
      const raw = fs.readFileSync(encPath, "utf8");
      const envelope = JSON.parse(raw) as EncryptedEnvelope;
      if (envelope.v === 1) return decryptJson<T>(envelope);
    } catch {
      /* fall through */
    }
  }

  if (fs.existsSync(legacyPath)) {
    try {
      const raw = fs.readFileSync(legacyPath, "utf8");
      const data = JSON.parse(raw) as T;
      writeEncryptedFileUnlocked(encPath, data);
      fs.unlinkSync(legacyPath);
      return data;
    } catch {
      /* corrupt */
    }
  }

  return empty;
}

function writeEncryptedFileUnlocked<T>(encPath: string, data: T): void {
  const envelope = encryptJson(data);
  const dir = path.dirname(encPath);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const tmpPath = `${encPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(envelope), { mode: 0o600 });
    fs.renameSync(tmpPath, encPath);
  } catch (e) {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      /* ignore cleanup failure */
    }
    throw e;
  }
}

export function readEncryptedFile<T>(
  encPath: string,
  legacyPath: string,
  empty: T,
): T {
  return withFileLockSync(encPath, () =>
    readEncryptedFileUnlocked(encPath, legacyPath, empty),
  );
}

/** Atomic write: temp file + rename avoids torn ciphertext on crash. */
export function writeEncryptedFile<T>(encPath: string, data: T): void {
  withFileLockSync(encPath, () => {
    writeEncryptedFileUnlocked(encPath, data);
  });
}

/** Locked read-modify-write — prevents lost updates across concurrent workers. */
export function mutateEncryptedFile<T>(
  encPath: string,
  legacyPath: string,
  empty: T,
  mutator: (current: T) => T,
): T {
  return withFileLockSync(encPath, () => {
    const current = readEncryptedFileUnlocked(encPath, legacyPath, empty);
    const next = mutator(current);
    writeEncryptedFileUnlocked(encPath, next);
    return next;
  });
}
