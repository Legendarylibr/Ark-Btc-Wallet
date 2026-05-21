import fs from "fs";
import path from "path";

export function getWalletDataDir(): string {
  const dir =
    process.env.WALLET_DATA_DIR ??
    path.join(process.cwd(), ".ark-wallet-data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  } else if (process.platform !== "win32") {
    try {
      fs.chmodSync(dir, 0o700);
    } catch {
      /* best-effort on Unix */
    }
  }
  return dir;
}
