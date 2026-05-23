import fs from "fs";
import path from "path";

const MAX_WAIT_MS = 5_000;
const RETRY_MS = 15;

/** Cross-process exclusive lock via O_EXCL lockfile (same volume as data dir). */
export function withFileLockSync<T>(filePath: string, fn: () => T): T {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const lockPath = `${filePath}.lock`;
  const deadline = Date.now() + MAX_WAIT_MS;
  let fd: number | null = null;

  while (Date.now() < deadline) {
    try {
      fd = fs.openSync(lockPath, "wx", 0o600);
      break;
    } catch {
      const waitUntil = Date.now() + RETRY_MS;
      while (Date.now() < waitUntil) {
        /* spin briefly */
      }
    }
  }

  if (fd === null) {
    throw new Error(`Could not acquire lock for ${filePath}`);
  }

  try {
    return fn();
  } finally {
    fs.closeSync(fd);
    try {
      fs.unlinkSync(lockPath);
    } catch {
      /* lock already released */
    }
  }
}
