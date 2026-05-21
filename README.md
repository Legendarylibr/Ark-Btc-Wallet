# Ark BTC Wallet

Cash App–style UI for **Ark-only** signet payments (`ark1…` addresses). Keys and signing use either local **[barkd](https://second.tech/docs/barkd)** (recommended) or an experimental in-browser **[Bark WASM](https://gitlab.com/ark-bitcoin/bark-ffi-bindings/-/tree/wasm)** backend.

- [Security model & production checklist](SECURITY.md)
- [Contributing](CONTRIBUTING.md)

## Quick start (barkd mode)

1. Install [Bark CLI + barkd](https://second.tech/docs/barkd/install).
2. Create a signet wallet and start the daemon:

```bash
bark create --signet --ark ark.signet.2nd.dev --esplora esplora.signet.2nd.dev
barkd
```

3. Run the app:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Get test sats from the [signet faucet](https://signet.2nd.dev/).

## Wallet backends

| | **barkd (default)** | **SDK (experimental)** |
|---|---------------------|-------------------------|
| Keys | barkd on loopback | Browser WASM + IndexedDB |
| Mnemonic in UI | No — use `bark create` | Yes — backup at create |
| WebAuthn | Server-verified | Client-only |

Do not treat SDK mode as a drop-in for barkd. Details: [SECURITY.md](SECURITY.md#trust-boundaries).

**SDK:** `npm run vendor:bark-wasm && npm run build:bark-wasm`, then set `NEXT_PUBLIC_WALLET_BACKEND=sdk` in `.env.local`.

## Configuration

See [.env.example](.env.example). Production requires `SESSION_SECRET` (≥16 characters). The dev server binds **127.0.0.1** only.

## Development

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |

## Architecture (barkd mode)

```
React UI + vault ──Ed25519──► Next.js API ──REST──► barkd ──► Ark signet
```

Bitcoin/Ark keys stay in barkd; the app holds an encrypted **UI signing key** and gates access with WebAuthn.

## License

[MIT](LICENSE)
