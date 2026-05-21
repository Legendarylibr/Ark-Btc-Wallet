#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Bark FFI WASM Bindings Generator - FOR MAINTAINERS ONLY
# ============================================================================
# This script is used by bark maintainers to generate and prepare the WASM
# bindings BEFORE publishing to npm or committing to git.
#
# END USERS of the bark WASM package DO NOT need to run this script!
# ============================================================================

# Get the absolute directory where this script is located
WASM_PKG_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
RUST_DIR="$WASM_PKG_DIR/rust"

echo "Building Bark FFI WASM Bindings"
echo "================================"
echo ""

# Check for required tools
if ! command -v wasm-pack &> /dev/null; then
    echo "Error: wasm-pack not found. Install from https://rustwasm.github.io/wasm-pack/installer/"
    exit 1
fi

if ! command -v cargo &> /dev/null; then
    echo "Error: cargo not found. Install Rust from https://rustup.rs"
    exit 1
fi

echo "wasm-pack version: $(wasm-pack --version)"
echo ""

# Ensure wasm target is installed
echo "Ensuring wasm32-unknown-unknown target is installed..."
rustup target add wasm32-unknown-unknown
echo ""

# Build for bundler target (web/browser)
echo "Building for bundler target (web/browser)..."
yarn build:web

echo ""

# Build for Node.js target
echo "Building for Node.js target..."
yarn build:node

echo ""
echo "Build complete!"
echo "Output: $WASM_PKG_DIR/pkg/bundler/ (web)"
echo "Output: $WASM_PKG_DIR/pkg/nodejs/ (Node.js)"
