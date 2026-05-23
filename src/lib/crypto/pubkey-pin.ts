import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import { constantTimeEqualString } from "./secure-compare";
import { mutateEncryptedFile } from "@/lib/encrypted-file";

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

function readPinFile(): PinFile {
  return mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (f) => f);
}

export type PinResult =
  | { ok: true; firstPin: boolean }
  | { ok: false; reason: string };

/** One Ed25519 public key per barkd wallet fingerprint */
export function verifyOrPinPubkey(
  fingerprint: string,
  publicKeyB64: string,
): PinResult {
  let result: PinResult = { ok: true, firstPin: false };

  mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (data) => {
    const existing = data.pins[fingerprint];

    if (!existing) {
      data.pins[fingerprint] = publicKeyB64;
      result = { ok: true, firstPin: true };
      return data;
    }

    if (!constantTimeEqualString(existing, publicKeyB64)) {
      result = {
        ok: false,
        reason:
          "This barkd wallet is already paired with a different signing key. Use the original device or reset .ark-wallet-data",
      };
      return data;
    }

    result = { ok: true, firstPin: false };
    return data;
  });

  return result;
}

export function getPinnedPubkey(fingerprint: string): string | null {
  return readPinFile().pins[fingerprint] ?? null;
}

export function hasAnyPubkeyPin(): boolean {
  return Object.keys(readPinFile().pins).length > 0;
}

/** Reverse lookup — avoids barkd walletStatus on first pairing. */
export function getFingerprintForPubkey(publicKeyB64: string): string | null {
  const pins = readPinFile().pins;
  for (const [fingerprint, pinned] of Object.entries(pins)) {
    if (constantTimeEqualString(pinned, publicKeyB64)) {
      return fingerprint;
    }
  }
  return null;
}

export function clearPin(fingerprint: string): void {
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (data) => {
    if (!(fingerprint in data.pins)) return data;
    const pins = { ...data.pins };
    delete pins[fingerprint];
    return { v: 1 as const, pins };
  });
}
