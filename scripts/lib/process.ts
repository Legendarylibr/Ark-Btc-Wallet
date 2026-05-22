import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function repoRoot(): string {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
}

export function run(cmd: string, args: string[], opts: { cwd?: string } = {}): void {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: opts.cwd,
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

export function which(cmd: string): boolean {
  const check = process.platform === "win32" ? "where" : "which";
  const r = spawnSync(check, [cmd], { shell: true, encoding: "utf8" });
  return r.status === 0;
}
