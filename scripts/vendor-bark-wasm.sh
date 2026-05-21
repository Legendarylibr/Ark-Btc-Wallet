#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/packages/bark-wasm"
TMP="$ROOT/packages/bark-ffi-bindings"

rm -rf "$TMP"
git clone --branch wasm --depth 1 --single-branch \
  https://gitlab.com/ark-bitcoin/bark-ffi-bindings.git "$TMP"

rm -rf "$DEST"
mkdir -p "$ROOT/packages"
cp -R "$TMP/wasm" "$DEST"

# Keep @secondts/bark-wasm name from our package.json overlay
cat > "$DEST/package.json" <<'EOF'
{
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
    "build": "./generate-bindings.sh",
    "build:web": "wasm-pack build ./rust --target bundler --out-dir ../pkg/bundler --out-name bark --release",
    "build:node": "wasm-pack build ./rust --target nodejs --out-dir ../pkg/nodejs --out-name bark --release"
  }
}
EOF

echo "Vendored wasm sources to packages/bark-wasm"
echo "Next: npm run build:bark-wasm  (requires Rust + wasm-pack)"
