import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import {
  readEncryptedFile,
  writeEncryptedFile,
} from "@/lib/encrypted-file";
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

type SessionGlobal = typeof globalThis & {
  __arkSessions?: Map<string, WalletSession>;
};

const g = globalThis as SessionGlobal;

function encPath(): string {
  return path.join(getWalletDataDir(), "sessions.enc.json");
}

function legacyPath(): string {
  return path.join(getWalletDataDir(), "sessions.json");
}

function loadFile(): SessionFile {
  return readEncryptedFile(encPath(), legacyPath(), EMPTY_FILE);
}

function saveFile(data: SessionFile): void {
  writeEncryptedFile(encPath(), data);
}

function getMap(): Map<string, WalletSession> {
  if (!g.__arkSessions) {
    g.__arkSessions = new Map();
    const file = loadFile();
    const now = Date.now();
    for (const s of Object.values(file.sessions)) {
      if (now - s.lastSeenAt > SESSION_TTL_MS) continue;
      g.__arkSessions.set(s.id, {
        id: s.id,
        publicKey: base64ToBytes(s.publicKey),
        barkFingerprint: s.barkFingerprint,
        clientIpHash: s.clientIpHash ?? null,
        createdAt: s.createdAt,
        lastSeenAt: s.lastSeenAt,
        lastHardwareAt: s.lastHardwareAt ?? null,
      });
    }
  }
  return g.__arkSessions;
}

function persist(): void {
  const map = getMap();
  const sessions: Record<string, StoredSession> = {};
  for (const s of map.values()) {
    sessions[s.id] = {
      id: s.id,
      publicKey: bytesToBase64(s.publicKey),
      barkFingerprint: s.barkFingerprint,
      clientIpHash: s.clientIpHash,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      lastHardwareAt: s.lastHardwareAt,
    };
  }
  saveFile({ v: 1, sessions });
}

function prune(): void {
  const map = getMap();
  const now = Date.now();
  let changed = false;
  for (const [id, s] of map) {
    if (now - s.lastSeenAt > SESSION_TTL_MS) {
      map.delete(id);
      changed = true;
    }
  }
  if (changed) persist();
}

export function createSession(
  publicKeyB64: string,
  barkFingerprint: string | null,
  clientIpHash: string | null = null,
): WalletSession {
  prune();
  const id = crypto.randomUUID();
  const now = Date.now();
  const session: WalletSession = {
    id,
    publicKey: base64ToBytes(publicKeyB64),
    barkFingerprint,
    clientIpHash,
    createdAt: now,
    lastSeenAt: now,
    lastHardwareAt: now,
  };
  getMap().set(id, session);
  persist();
  return session;
}

export function getSession(id: string): WalletSession | null {
  prune();
  const s = getMap().get(id);
  if (!s) return null;
  const now = Date.now();
  if (now - s.createdAt > SESSION_TTL_MS) {
    getMap().delete(id);
    persist();
    return null;
  }
  if (now - s.lastSeenAt > SERVER_SESSION_IDLE_MS) {
    getMap().delete(id);
    persist();
    return null;
  }
  return s;
}

export function touchSession(id: string): void {
  const s = getMap().get(id);
  if (s) {
    s.lastSeenAt = Date.now();
    persist();
  }
}

export function destroySession(id: string): void {
  if (getMap().delete(id)) persist();
}

/** Reject if session was created without binding or client fingerprint changed. */
export function ensureSessionClientBinding(
  sessionId: string,
  binding: string,
): "ok" | "missing" | "mismatch" {
  const s = getMap().get(sessionId);
  if (!s) return "missing";
  if (!s.clientIpHash || s.clientIpHash !== binding) return "mismatch";
  return "ok";
}

export function isTimestampValid(timestampMs: number): boolean {
  const now = Date.now();
  return Math.abs(now - timestampMs) <= MAX_CLOCK_SKEW_MS;
}

export function touchSessionHardware(sessionId: string): void {
  const s = getMap().get(sessionId);
  if (s) {
    s.lastHardwareAt = Date.now();
    persist();
  }
}

export function isHardwareFreshForRead(sessionId: string): boolean {
  const s = getSession(sessionId);
  if (!s?.lastHardwareAt) return false;
  return Date.now() - s.lastHardwareAt <= READ_HARDWARE_TTL_MS;
}
