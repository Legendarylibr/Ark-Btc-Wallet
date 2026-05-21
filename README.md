# Ark BTC Wallet

Cash App–style wallet for **Ark-only** signet payments (`ark1…` addresses). Self-custodial keys live in **[barkd](https://second.tech/docs/barkd)** on your machine (recommended), or optionally in the browser via **[Bark WASM](https://gitlab.com/ark-bitcoin/bark-ffi-bindings/-/tree/wasm)** (experimental).

[![CI](https://github.com/Legendarylibr/Ark-Btc-Wallet/actions/workflows/ci.yml/badge.svg)](https://github.com/Legendarylibr/Ark-Btc-Wallet/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- Pay and request with **Ark addresses** — instant arkoor settlement on signet
- **barkd mode** — mnemonic stays in CLI; UI uses passphrase + **WebAuthn** (Touch ID, YubiKey, Windows Hello) + Ed25519-signed API
- **SDK mode** — optional in-browser wallet with passkey (PRF) unlock and recovery passphrase
- Auto-sync balance and activity; **Secure** flow for VTXO refresh after receives
- Loopback-only API hardening, session binding, replay-safe nonces

## Quick start

**barkd (recommended):**

```bash
bark create --signet --ark ark.signet.2nd.dev --esplora esplora.signet.2nd.dev
barkd

git clone https://github.com/Legendarylibr/Ark-Btc-Wallet.git
cd Ark-Btc-Wallet
cp .env.example .env.local
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) → set passphrase → register hardware → unlock → get sats from the [signet faucet](https://signet.2nd.dev/).

**SDK (experimental):** see [docs/sdk-mode.md](docs/sdk-mode.md).

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/getting-started.md](docs/getting-started.md) | Full barkd setup, first unlock, Pay / Secure |
| [docs/sdk-mode.md](docs/sdk-mode.md) | WASM build, passkeys, recovery |
| [docs/architecture.md](docs/architecture.md) | barkd vs SDK paths, signing layers, file map |
| [docs/configuration.md](docs/configuration.md) | Environment variables, production checklist |
| [docs/troubleshooting.md](docs/troubleshooting.md) | Common errors |
| [SECURITY.md](SECURITY.md) | Trust model and incident response |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Dev workflow and project layout |

## Wallet backends

| | **barkd (default)** | **SDK** |
|---|---------------------|---------|
| Keys | barkd `@ 127.0.0.1:3535` | Browser WASM + IndexedDB |
| Mnemonic in UI | No | Yes (backup once) |
| WebAuthn | Server-verified | Client-only |

Do not treat SDK as a drop-in for barkd. See [SECURITY.md](SECURITY.md).

## Development

```bash
npm run lint
npm test
npm run build
```

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (`127.0.0.1:3000`) |
| `npm run build` / `start` | Production |
| `npm test` | Vitest (78+ unit tests) |

## License

[MIT](LICENSE) — Copyright (c) 2026 [Legendarylibr](https://github.com/Legendarylibr)
