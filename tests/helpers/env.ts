import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDirs: string[] = [];

/** Isolated `.ark-wallet-data` for server-side persistence tests. */
export function useTempWalletDataDir(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ark-wallet-test-"));
  tmpDirs.push(tmp);
  process.env.WALLET_DATA_DIR = tmp;
  process.env.SESSION_SECRET = "test-secret-for-encryption-32chars";
  return tmp;
}

export function cleanupTempWalletDataDirs(): void {
  for (const tmp of tmpDirs.splice(0)) {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  delete process.env.WALLET_DATA_DIR;
  delete process.env.SESSION_SECRET;
}
