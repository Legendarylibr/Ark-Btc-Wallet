import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import { constantTimeEqualString } from "./secure-compare";
import {
  readEncryptedFile,
  writeEncryptedFile,
} from "@/lib/encrypted-file";

interface PinFile {
  v: 1;
  pins: Record<string, string>;
}

const EMPTY: PinFile = { v: 1, pins: {} };

function encPath(): string {
  return path.join(getWalletDataDir(), "pubkey-pins.enc.json");
}

function legacyPath(): string {
  return path.join(getWalletDataDir(), "pubkey-pins.json");
}

function load(): PinFile {
  return readEncryptedFile(encPath(), legacyPath(), EMPTY);
}

function save(data: PinFile): void {
  writeEncryptedFile(encPath(), data);
}

export type PinResult =
  | { ok: true; firstPin: boolean }
  | { ok: false; reason: string };

/** One Ed25519 public key per barkd wallet fingerprint */
export function verifyOrPinPubkey(
  fingerprint: string,
  publicKeyB64: string,
): PinResult {
  const data = load();
  const existing = data.pins[fingerprint];

  if (!existing) {
    data.pins[fingerprint] = publicKeyB64;
    save(data);
    return { ok: true, firstPin: true };
  }

  if (!constantTimeEqualString(existing, publicKeyB64)) {
    return {
      ok: false,
      reason:
        "This barkd wallet is already paired with a different signing key. Use the original device or reset .ark-wallet-data",
    };
  }

  return { ok: true, firstPin: false };
}

export function getPinnedPubkey(fingerprint: string): string | null {
  return load().pins[fingerprint] ?? null;
}

export function hasAnyPubkeyPin(): boolean {
  return Object.keys(load().pins).length > 0;
}

/** Reverse lookup — avoids barkd walletStatus on first pairing. */
export function getFingerprintForPubkey(publicKeyB64: string): string | null {
  const pins = load().pins;
  for (const [fingerprint, pinned] of Object.entries(pins)) {
    if (constantTimeEqualString(pinned, publicKeyB64)) {
      return fingerprint;
    }
  }
  return null;
}

export function clearPin(fingerprint: string): void {
  const data = load();
  delete data.pins[fingerprint];
  save(data);
}
