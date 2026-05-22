"use client";

import { create } from "zustand";
import type { UnlockedIdentity } from "@/lib/crypto/vault";
import {
  createVault,
  loadVaultFromStorage,
  migrateVaultStorage,
  saveVaultToStorage,
  unlockVault,
  vaultExists,
  zeroize,
} from "@/lib/crypto/vault";
import { bytesToBase64, sign } from "@/lib/crypto/ed25519";
import { challengeMessage } from "@/lib/crypto/challenge-messages";
import { hashBody } from "@/lib/crypto/canonical";
import { arkClientHeaders } from "@/lib/ark-client";
import { LOGOUT_HEADER } from "@/lib/crypto/cookie";
import { validatePassphrase } from "@/lib/passphrase";
import {
  authenticateWithHardware,
  fetchHardwareStatus,
  registerHardwareDevice,
} from "@/lib/webauthn/client";
import {
  HARDWARE_AUTH_HEADER,
  PENDING_OP_HEADER,
} from "@/lib/webauthn/constants";
import { preSessionSignedJson } from "@/lib/pre-session-fetch";

import { WALLET_LOCK_TIMEOUT_MS } from "@/lib/security/constants";

const LOCK_TIMEOUT_MS = WALLET_LOCK_TIMEOUT_MS;
const MAX_UNLOCK_ATTEMPTS = 8;
const UNLOCK_WINDOW_MS = 15 * 60 * 1000;
const UNLOCK_ATTEMPTS_KEY = "ark-unlock-attempts-v2";

function unlockBackoffMs(attempts: number): number {
  return Math.min(500 * 2 ** Math.min(attempts, 5), 8000);
}

interface CryptoState {
  identity: UnlockedIdentity | null;
  hasVault: boolean;
  vaultReady: boolean;
  hardwareRegistered: boolean;
  sessionRegistered: boolean;
  pairingNotice: string | null;
  lockTimer: ReturnType<typeof setTimeout> | null;

  init: () => Promise<void>;
  setupVault: (passphrase: string) => Promise<void>;
  registerHardware: (passphrase: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<void>;
  lock: () => Promise<void>;
  touchActivity: () => void;
  getIdentity: () => UnlockedIdentity;
  clearPairingNotice: () => void;
}

export const useCryptoStore = create<CryptoState>((set, get) => ({
  identity: null,
  hasVault: false,
  vaultReady: false,
  hardwareRegistered: false,
  sessionRegistered: false,
  pairingNotice: null,
  lockTimer: null,

  init: async () => {
    await migrateVaultStorage();
    const hasVault = await vaultExists();
    let hardwareRegistered = false;
    if (hasVault) {
      try {
        const status = await fetchHardwareStatus();
        hardwareRegistered = status.registered;
      } catch {
        hardwareRegistered = false;
      }
    }
    set({ hasVault, hardwareRegistered, vaultReady: true });
  },

  setupVault: async (passphrase) => {
    const err = validatePassphrase(passphrase);
    if (err) throw new Error(err);

    const { vault, identity } = await createVault(passphrase);
    await saveVaultToStorage(vault);
    zeroize(identity.privateKey);
    set({
      hasVault: true,
      identity: null,
      hardwareRegistered: false,
      sessionRegistered: false,
    });
  },

  registerHardware: async (passphrase) => {
    await registerHardwareDevice(passphrase);
    set({ hardwareRegistered: true });
  },

  unlock: async (passphrase) => {
    const checkRes = await fetch("/api/auth/unlock-check", {
      method: "POST",
      headers: arkClientHeaders(),
      credentials: "same-origin",
    });
    const checkBody = (await checkRes.json().catch(() => ({}))) as {
      allowed?: boolean;
      unlockToken?: string;
      error?: string;
    };
    if (!checkRes.ok || !checkBody.allowed || !checkBody.unlockToken) {
      throw new Error(
        checkBody.error ?? "Too many unlock attempts — wait 15 minutes",
      );
    }
    const unlockToken = checkBody.unlockToken;

    const attempts = getUnlockAttempts();
    if (attempts.count >= MAX_UNLOCK_ATTEMPTS) {
      throw new Error("Too many unlock attempts — wait 15 minutes");
    }

    if (!get().hardwareRegistered) {
      throw new Error("Register a security key or passkey first");
    }

    const vault = await loadVaultFromStorage();
    if (!vault) throw new Error("No wallet vault — set up a passphrase first");

    let identity: UnlockedIdentity;
    try {
      identity = await unlockVault(passphrase, vault);
    } catch (e) {
      recordUnlockFailure();
      await reportUnlockFailure(unlockToken);
      const delay = unlockBackoffMs(attempts.count);
      await new Promise((r) => setTimeout(r, delay));
      throw e;
    }
    clearUnlockAttempts();

    try {
      const challengeRes = await fetch("/api/auth/challenge", {
        credentials: "same-origin",
        headers: arkClientHeaders(),
      });
      if (!challengeRes.ok) throw new Error("Could not get challenge");
      const { challenge } = await challengeRes.json();

      const nonce = crypto.randomUUID();
      const timestamp = Date.now();
      const message = challengeMessage(challenge);
      const signature = await sign(message, identity.privateKey);

      const registerBody = JSON.stringify({
        publicKey: bytesToBase64(identity.publicKey),
        challenge,
        signature: bytesToBase64(signature),
        timestamp,
        nonce,
      });

      const bodyHash = hashBody(registerBody);
      const { opId } = await preSessionSignedJson<{ opId: string }>(
        identity,
        "/api/auth/webauthn/pending-op",
        { type: "session-register", bodyHash },
      );

      const hardwareAuth = await authenticateWithHardware(opId);

      const reg = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...arkClientHeaders(),
          [HARDWARE_AUTH_HEADER]: JSON.stringify({
            response: hardwareAuth.response,
            challenge: hardwareAuth.challenge,
            opId,
          }),
          [PENDING_OP_HEADER]: opId,
        },
        credentials: "same-origin",
        body: registerBody,
      });

      if (!reg.ok) {
        const err = await reg.json();
        throw new Error(err.error ?? "Session registration failed");
      }

      const data = (await reg.json()) as {
        firstPin?: boolean;
        fingerprint?: string;
      };

      let pairingNotice: string | null = null;
      if (data.firstPin && data.fingerprint) {
        pairingNotice = `Paired with barkd wallet ${data.fingerprint.slice(0, 12)}…`;
      }

      set({
        identity,
        hasVault: true,
        sessionRegistered: true,
        pairingNotice,
      });
      get().touchActivity();
    } catch (e) {
      zeroize(identity.privateKey);
      throw e;
    }
  },

  lock: async () => {
    const t = get().lockTimer;
    if (t) clearTimeout(t);
    const { identity } = get();
    if (identity) zeroize(identity.privateKey);
    set({
      identity: null,
      sessionRegistered: false,
      pairingNotice: null,
      lockTimer: null,
    });
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { [LOGOUT_HEADER]: "1", ...arkClientHeaders() },
      credentials: "same-origin",
    });
  },

  touchActivity: () => {
    const t = get().lockTimer;
    if (t) clearTimeout(t);
    const timer = setTimeout(() => {
      get().lock();
    }, LOCK_TIMEOUT_MS);
    set({ lockTimer: timer });
  },

  getIdentity: () => {
    const { identity } = get();
    if (!identity) throw new Error("Wallet locked");
    get().touchActivity();
    return identity;
  },

  clearPairingNotice: () => set({ pairingNotice: null }),
}));

function getUnlockAttempts(): { count: number; since: number } {
  if (typeof window === "undefined") return { count: 0, since: Date.now() };
  try {
    const raw = localStorage.getItem(UNLOCK_ATTEMPTS_KEY);
    if (!raw) return { count: 0, since: Date.now() };
    const data = JSON.parse(raw) as { count: number; since: number };
    if (Date.now() - data.since > UNLOCK_WINDOW_MS) {
      return { count: 0, since: Date.now() };
    }
    return data;
  } catch {
    return { count: 0, since: Date.now() };
  }
}

function recordUnlockFailure(): void {
  const prev = getUnlockAttempts();
  localStorage.setItem(
    UNLOCK_ATTEMPTS_KEY,
    JSON.stringify({ count: prev.count + 1, since: prev.since }),
  );
}

async function reportUnlockFailure(unlockToken: string): Promise<void> {
  try {
    await fetch("/api/auth/unlock-failed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...arkClientHeaders(),
      },
      credentials: "same-origin",
      body: JSON.stringify({ unlockToken }),
    });
  } catch {
    /* best-effort server budget */
  }
}

function clearUnlockAttempts(): void {
  localStorage.removeItem(UNLOCK_ATTEMPTS_KEY);
}
