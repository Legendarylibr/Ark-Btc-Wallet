import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import { mutateEncryptedFile } from "@/lib/encrypted-file";
import {
  MAX_CLOCK_SKEW_MS,
  READ_HARDWARE_TTL_MS,
  SERVER_SESSION_IDLE_MS,
  SERVER_SESSION_TTL_MS,
} from "@/lib/security/constants";
import { base64ToBytes, bytesToBase64 } from "./ed25519";

export { SESSION_COOKIE } from "./cookie";

export interface WalletSession {
  id: string;
  publicKey: Uint8Array;
  barkFingerprint: string | null;
  clientIpHash: string | null;
  createdAt: number;
  lastSeenAt: number;
  lastHardwareAt: number | null;
}

interface StoredSession {
  id: string;
  publicKey: string;
  barkFingerprint: string | null;
  clientIpHash?: string | null;
  createdAt: number;
  lastSeenAt: number;
  lastHardwareAt?: number | null;
}

interface SessionFile {
  v: 1;
  sessions: Record<string, StoredSession>;
}

const SESSION_TTL_MS = SERVER_SESSION_TTL_MS;

const EMPTY_FILE: SessionFile = { v: 1, sessions: {} };

function encPath(): string {
  return path.join(getWalletDataDir(), "sessions.enc.json");
}

function legacyPath(): string {
  return path.join(getWalletDataDir(), "sessions.json");
}

function storedToSession(s: StoredSession): WalletSession {
  return {
    id: s.id,
    publicKey: base64ToBytes(s.publicKey),
    barkFingerprint: s.barkFingerprint,
    clientIpHash: s.clientIpHash ?? null,
    createdAt: s.createdAt,
    lastSeenAt: s.lastSeenAt,
    lastHardwareAt: s.lastHardwareAt ?? null,
  };
}

function isSessionLive(s: StoredSession, now: number): boolean {
  if (now - s.createdAt > SESSION_TTL_MS) return false;
  if (now - s.lastSeenAt > SERVER_SESSION_IDLE_MS) return false;
  return true;
}

function pruneSessions(
  sessions: Record<string, StoredSession>,
  now: number,
): Record<string, StoredSession> {
  const pruned: Record<string, StoredSession> = {};
  for (const [id, s] of Object.entries(sessions)) {
    if (isSessionLive(s, now)) pruned[id] = s;
  }
  return pruned;
}

/** Disk-authoritative read; prunes expired sessions under file lock. */
function refreshSessionFile(): SessionFile {
  const now = Date.now();
  return mutateEncryptedFile(encPath(), legacyPath(), EMPTY_FILE, (f) => {
    const sessions = pruneSessions(f.sessions, now);
    if (Object.keys(sessions).length === Object.keys(f.sessions).length) {
      return f;
    }
    return { v: 1 as const, sessions };
  });
}

export function pruneExpiredSessions(): void {
  refreshSessionFile();
}

export function createSession(
  publicKeyB64: string,
  barkFingerprint: string | null,
  clientIpHash: string | null = null,
): WalletSession {
  const id = crypto.randomUUID();
  const now = Date.now();
  const stored: StoredSession = {
    id,
    publicKey: publicKeyB64,
    barkFingerprint,
    clientIpHash,
    createdAt: now,
    lastSeenAt: now,
    lastHardwareAt: now,
  };
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY_FILE, (f) => {
    const sessions = pruneSessions(f.sessions, now);
    sessions[id] = stored;
    return { v: 1 as const, sessions };
  });
  return storedToSession(stored);
}

export function getSession(id: string): WalletSession | null {
  const file = refreshSessionFile();
  const s = file.sessions[id];
  if (!s) return null;
  const now = Date.now();
  if (!isSessionLive(s, now)) {
    mutateEncryptedFile(encPath(), legacyPath(), EMPTY_FILE, (f) => {
      const sessions = pruneSessions(f.sessions, now);
      delete sessions[id];
      return { v: 1 as const, sessions };
    });
    return null;
  }
  return storedToSession(s);
}

export function touchSession(id: string): void {
  const now = Date.now();
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY_FILE, (f) => {
    const sessions = pruneSessions(f.sessions, now);
    const s = sessions[id];
    if (!s) return f;
    sessions[id] = { ...s, lastSeenAt: now };
    return { v: 1 as const, sessions };
  });
}

export function destroySession(id: string): void {
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY_FILE, (f) => {
    if (!(id in f.sessions)) return f;
    const sessions = { ...f.sessions };
    delete sessions[id];
    return { v: 1 as const, sessions };
  });
}

/** Reject if session was created without binding or client fingerprint changed. */
export function ensureSessionClientBinding(
  sessionId: string,
  binding: string,
): "ok" | "missing" | "mismatch" {
  const s = getSession(sessionId);
  if (!s) return "missing";
  if (!s.clientIpHash || s.clientIpHash !== binding) return "mismatch";
  return "ok";
}

export function isTimestampValid(timestampMs: number): boolean {
  const now = Date.now();
  return Math.abs(now - timestampMs) <= MAX_CLOCK_SKEW_MS;
}

export function touchSessionHardware(sessionId: string): void {
  const now = Date.now();
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY_FILE, (f) => {
    const sessions = pruneSessions(f.sessions, now);
    const s = sessions[sessionId];
    if (!s) return f;
    sessions[sessionId] = { ...s, lastHardwareAt: now };
    return { v: 1 as const, sessions };
  });
}

export function isHardwareFreshForRead(sessionId: string): boolean {
  const s = getSession(sessionId);
  if (!s?.lastHardwareAt) return false;
  return Date.now() - s.lastHardwareAt <= READ_HARDWARE_TTL_MS;
}
