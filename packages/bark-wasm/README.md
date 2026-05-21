# Bark FFI - WASM Bindings

WASM bindings for the Ark Bitcoin protocol developed by [second.tech](https://second.tech).

## Overview

These bindings provide a WebAssembly interface to the Bark implementation, enabling usage in both browser and Node.js environments. The native library is written in Rust and compiled to WASM using [wasm-pack](https://rustwasm.github.io/wasm-pack/).

## Installation

### Requirements

- Node.js 18+ (for Node.js usage)
- A bundler with WASM support (e.g., webpack, vite) for browser usage

### Install via npm

```bash
npm install bark
```

### Usage (Browser / Bundler)

```javascript
import init, { generateMnemonic, validateMnemonic } from 'bark';

// Initialize the WASM module
await init();

// Generate a new mnemonic
const mnemonic = generateMnemonic();
console.log('Mnemonic:', mnemonic);

// Validate a mnemonic
const isValid = validateMnemonic(mnemonic);
console.log('Valid:', isValid);
```

### Usage (Node.js)

```javascript
const { generateMnemonic, validateMnemonic } = require('bark');

const mnemonic = generateMnemonic();
console.log('Mnemonic:', mnemonic);
```

## Build Targets

The package includes two build targets:

| Target | Directory | Use Case |
|--------|-----------|----------|
| Bundler | `pkg/bundler/` | Browser apps with webpack, vite, etc. |
| Node.js | `pkg/nodejs/` | Server-side Node.js applications |

## Development

### For Package Maintainers

**Requirements:**

- Rust toolchain (cargo, rustc)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)

### Building Locally

```bash
# From the repository root
make wasm

# Or directly
cd wasm && ./generate-bindings.sh
```

### Building Individual Targets

```bash
# Build for browser/bundler only
cd wasm && wasm-pack build ./rust --target bundler --out-dir ../pkg/bundler --out-name bark --release

# Build for Node.js only
cd wasm && wasm-pack build ./rust --target nodejs --out-dir ../pkg/nodejs --out-name bark --release
```

## Documentation

- [Bark Protocol Documentation](https://docs.second.tech/bark)
- [wasm-pack Documentation](https://rustwasm.github.io/wasm-pack/)

## Support

- **Issues:** https://gitlab.com/ark-bitcoin/bark-ffi-bindings/-/issues
- **Discussions:** https://chat.second.tech/
- **Email:** hello@second.tech

## License

MIT OR Apache-2.0

---

**Version:** 0.2.0-beta.1+bark.0.1.0-beta.8
