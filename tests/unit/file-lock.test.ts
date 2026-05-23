import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { withFileLockSync } from "@/lib/file-lock";
import {
  mutateEncryptedFile,
  readEncryptedFile,
  writeEncryptedFile,
} from "@/lib/encrypted-file";
import { cleanupTempWalletDataDirs, useTempWalletDataDir } from "../helpers/env";

describe("file-lock", () => {
  afterEach(() => cleanupTempWalletDataDirs());

  it("serializes concurrent writers", () => {
    const dir = useTempWalletDataDir();
    const file = path.join(dir, "counter.enc.json");
    const legacy = path.join(dir, "counter.json");

    for (let i = 0; i < 20; i++) {
      mutateEncryptedFile(file, legacy, { n: 0 }, (cur) => ({ n: cur.n + 1 }));
    }

    expect(readEncryptedFile(file, legacy, { n: 0 }).n).toBe(20);
  });

  it("releases lock after callback throws", () => {
    const dir = useTempWalletDataDir();
    const file = path.join(dir, "x.enc.json");
    expect(() =>
      withFileLockSync(file, () => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(() => writeEncryptedFile(file, { ok: true })).not.toThrow();
    expect(fs.existsSync(`${file}.lock`)).toBe(false);
  });
});

describe("mutateEncryptedFile", () => {
  afterEach(() => cleanupTempWalletDataDirs());

  it("applies mutator atomically", () => {
    const dir = useTempWalletDataDir();
    const encPath = path.join(dir, "mut.enc.json");
    const legacyPath = path.join(dir, "mut.json");
    writeEncryptedFile(encPath, { items: ["a"] });
    const next = mutateEncryptedFile(encPath, legacyPath, { items: [] }, (cur) => ({
      items: [...cur.items, "b"],
    }));
    expect(next.items).toEqual(["a", "b"]);
    expect(readEncryptedFile(encPath, legacyPath, { items: [] }).items).toEqual([
      "a",
      "b",
    ]);
  });
});
