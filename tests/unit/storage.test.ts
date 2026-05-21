import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  readEncryptedFile,
  writeEncryptedFile,
} from "@/lib/encrypted-file";
import {
  clearPin,
  getPinnedPubkey,
  verifyOrPinPubkey,
} from "@/lib/crypto/pubkey-pin";
import { cleanupTempWalletDataDirs, useTempWalletDataDir } from "../helpers/env";

describe("encrypted-file", () => {
  afterEach(() => cleanupTempWalletDataDirs());

  it("round-trips encrypted JSON", () => {
    const tmp = useTempWalletDataDir();
    const enc = path.join(tmp, "data.enc.json");
    const leg = path.join(tmp, "data.json");
    writeEncryptedFile(enc, { secret: 42 });
    const data = readEncryptedFile<{ secret: number }>(enc, leg, {
      secret: 0,
    });
    expect(data.secret).toBe(42);
  });

  it("migrates legacy plaintext file", () => {
    const tmp = useTempWalletDataDir();
    const enc = path.join(tmp, "migrate.enc.json");
    const leg = path.join(tmp, "migrate.json");
    fs.writeFileSync(leg, JSON.stringify({ legacy: true }), { mode: 0o600 });
    const data = readEncryptedFile<{ legacy: boolean }>(enc, leg, {
      legacy: false,
    });
    expect(data.legacy).toBe(true);
    expect(fs.existsSync(enc)).toBe(true);
    expect(fs.existsSync(leg)).toBe(false);
  });
});

describe("pubkey-pin", () => {
  afterEach(() => cleanupTempWalletDataDirs());

  it("pins first pubkey per fingerprint", () => {
    useTempWalletDataDir();
    const fp = "bark-fp-test";
    clearPin(fp);
    const pk1 = "cGsxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    const pk2 = "cGsyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    expect(verifyOrPinPubkey(fp, pk1).ok).toBe(true);
    expect(verifyOrPinPubkey(fp, pk1).firstPin).toBe(false);
    expect(verifyOrPinPubkey(fp, pk2).ok).toBe(false);
    expect(getPinnedPubkey(fp)).toBe(pk1);
  });
});
