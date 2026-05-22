#!/usr/bin/env node
/**
 * Cross-platform: wasm-pack build for SDK mode.
 */
import fs from "node:fs";
import path from "node:path";
import { repoRoot, run, which } from "./lib/process";

const ROOT = repoRoot();
const WASM_DIR = path.join(ROOT, "packages", "bark-wasm");
const RUST_DIR = path.join(WASM_DIR, "rust");

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
  { cwd: WASM_DIR },
);

console.log("Built packages/bark-wasm/pkg/bundler — run npm install at repo root");
