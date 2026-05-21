#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/packages/bark-wasm"

if ! command -v wasm-pack >/dev/null 2>&1; then
  echo "wasm-pack not found. Install: cargo install wasm-pack" >&2
  exit 1
fi
if ! command -v cargo >/dev/null 2>&1; then
  echo "Rust (cargo) not found. Install: https://rustup.rs" >&2
  exit 1
fi

npm run build:web
echo "Built packages/bark-wasm/pkg/bundler — run npm install at repo root"
