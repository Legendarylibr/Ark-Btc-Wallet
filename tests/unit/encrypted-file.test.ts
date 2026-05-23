import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  readEncryptedFile,
  writeEncryptedFile,
} from "@/lib/encrypted-file";
import { cleanupTempWalletDataDirs, useTempWalletDataDir } from "../helpers/env";

describe("encrypted-file", () => {
  afterEach(() => cleanupTempWalletDataDirs());

  it("round-trips encrypted JSON", () => {
    const dir = useTempWalletDataDir();
    const encPath = path.join(dir, "roundtrip.enc.json");
    const legacyPath = path.join(dir, "roundtrip.json");
    writeEncryptedFile(encPath, { count: 42 });
    const loaded = readEncryptedFile(encPath, legacyPath, { count: 0 });
    expect(loaded).toEqual({ count: 42 });
  });

  it("leaves no temp files after atomic write", () => {
    const dir = useTempWalletDataDir();
    const encPath = path.join(dir, "atomic.enc.json");
    const legacyPath = path.join(dir, "atomic.json");
    writeEncryptedFile(encPath, { step: 1 });
    const tmpFiles = fs.readdirSync(dir).filter((f) => f.endsWith(".tmp"));
    expect(tmpFiles).toHaveLength(0);
    expect(readEncryptedFile(encPath, legacyPath, { step: 0 })).toEqual({
      step: 1,
    });
  });

  it("migrates legacy plaintext and removes legacy file", () => {
    const dir = useTempWalletDataDir();
    const encPath = path.join(dir, "migrate.enc.json");
    const legacyPath = path.join(dir, "migrate.json");
    fs.writeFileSync(legacyPath, JSON.stringify({ v: 1, items: ["a"] }), {
      mode: 0o600,
    });

    const loaded = readEncryptedFile<{ v: number; items: string[] }>(
      encPath,
      legacyPath,
      { v: 0, items: [] },
    );
    expect(loaded).toEqual({ v: 1, items: ["a"] });
    expect(fs.existsSync(encPath)).toBe(true);
    expect(fs.existsSync(legacyPath)).toBe(false);
  });
});
