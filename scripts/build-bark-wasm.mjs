#!/usr/bin/env node
/**
 * Cross-platform: wasm-pack build for SDK mode.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const WASM_DIR = path.join(ROOT, "packages", "bark-wasm");
const RUST_DIR = path.join(WASM_DIR, "rust");

function which(cmd) {
  const check = process.platform === "win32" ? "where" : "which";
  const r = spawnSync(check, [cmd], { shell: true, encoding: "utf8" });
  return r.status === 0;
}

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd,
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!fs.existsSync(RUST_DIR)) {
  console.error(
    "packages/bark-wasm/rust not found. Run: npm run vendor:bark-wasm",
  );
  process.exit(1);
}

if (!which("wasm-pack")) {
  console.error(
    "wasm-pack not found. Install: https://rustwasm.github.io/wasm-pack/installer/",
  );
  console.error("  or: cargo install wasm-pack");
  process.exit(1);
}

if (!which("cargo")) {
  console.error("Rust (cargo) not found. Install: https://rustup.rs");
  process.exit(1);
}

run(
  "wasm-pack",
  [
    "build",
    "./rust",
    "--target",
    "bundler",
    "--out-dir",
    "../pkg/bundler",
    "--out-name",
    "bark",
    "--release",
  ],
  WASM_DIR,
);

console.log("Built packages/bark-wasm/pkg/bundler — run npm install at repo root");
