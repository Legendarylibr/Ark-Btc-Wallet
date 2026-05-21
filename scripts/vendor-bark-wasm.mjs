#!/usr/bin/env node
/**
 * Cross-platform: clone Bark WASM bindings into packages/bark-wasm.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEST = path.join(ROOT, "packages", "bark-wasm");
const TMP = path.join(ROOT, "packages", "bark-ffi-bindings");
const REPO = "https://gitlab.com/ark-bitcoin/bark-ffi-bindings.git";

const PACKAGE_JSON = `{
  "name": "@secondts/bark-wasm",
  "version": "0.2.0-beta.1",
  "description": "WASM bindings for the Bark Bitcoin protocol (Ark) — browser bundler build",
  "license": "MIT OR Apache-2.0",
  "files": ["pkg/bundler", "pkg/nodejs"],
  "exports": {
    ".": {
      "require": "./pkg/nodejs/bark.js",
      "import": "./pkg/bundler/bark.js",
      "types": "./pkg/bundler/bark.d.ts"
    }
  },
  "main": "./pkg/nodejs/bark.js",
  "module": "./pkg/bundler/bark.js",
  "types": "./pkg/bundler/bark.d.ts",
  "scripts": {
    "build:web": "wasm-pack build ./rust --target bundler --out-dir ../pkg/bundler --out-name bark --release",
    "build:node": "wasm-pack build ./rust --target nodejs --out-dir ../pkg/nodejs --out-name bark --release"
  }
}
`;

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: opts.cwd,
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function rm(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

if (spawnSync("git", ["--version"], { shell: true }).status !== 0) {
  console.error("git is required. Install Git for your OS.");
  process.exit(1);
}

rm(TMP);
fs.mkdirSync(path.join(ROOT, "packages"), { recursive: true });
run("git", [
  "clone",
  "--branch",
  "wasm",
  "--depth",
  "1",
  "--single-branch",
  REPO,
  TMP,
]);

rm(DEST);
fs.cpSync(path.join(TMP, "wasm"), DEST, { recursive: true });
fs.writeFileSync(path.join(DEST, "package.json"), PACKAGE_JSON, "utf8");
rm(TMP);

console.log("Vendored wasm sources to packages/bark-wasm");
console.log("Next: npm run build:bark-wasm  (requires Rust + wasm-pack)");
