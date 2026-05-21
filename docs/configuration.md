# Configuration

Copy [.env.example](../.env.example) to `.env.local` for local development.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_WALLET_BACKEND` | `barkd` | `barkd` (recommended) or `sdk` (browser WASM). Public — baked into client bundle. |
| `BARKD_URL` | `http://127.0.0.1:3535` | barkd REST base URL. **Must be loopback** — enforced at runtime. |
| `SESSION_SECRET` | — | **Required in production** (≥16 chars). Encrypts `.ark-wallet-data/*`. |
| `WALLET_DATA_DIR` | `.ark-wallet-data` | Server-side encrypted state directory. |
| `BARKD_AUTH_HEADER` | `Authorization` | Header name when `BARKD_AUTH_TOKEN` is set. |
| `BARKD_AUTH_TOKEN` | — | Optional bearer token for barkd HTTP API. |
| `ARK_SERVER` | `https://ark.signet.2nd.dev` | Ark server (signet). |
| `ESPLORA_URL` | `https://esplora.signet.2nd.dev` | Esplora (signet). |
| `BARK_NETWORK` | `signet` | Network label. |
| `TRUST_PROXY` | `false` | If `true`, use `X-Forwarded-For` / `X-Real-IP` for rate limits and session binding. |
| `ALLOW_REMOTE_HOST` | `false` | If `true`, disables loopback Host/Origin checks. **Fatal in production startup.** |
| `ENABLE_HSTS` | `false` | Adds Strict-Transport-Security and CSP upgrade when behind HTTPS. |

## Production checklist

1. `SESSION_SECRET` — generate with e.g. `openssl rand -base64 32`.
2. Keep `ALLOW_REMOTE_HOST` unset or `false`.
3. Run `npm run build && npm run start` (binds `127.0.0.1:3000`).
4. barkd on loopback only; stop when not in use.
5. Set `BARKD_AUTH_TOKEN` when your barkd build supports it.
6. Optional: `ENABLE_HSTS=true` behind a local TLS reverse proxy.
7. Never commit `.env.local` or `.ark-wallet-data/`.

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server on `127.0.0.1:3000` (Turbopack). |
| `npm run build` | Production build. |
| `npm run start` | Production server on `127.0.0.1`. |
| `npm test` | Vitest unit tests. |
| `npm run lint` | ESLint on `src/`. |
| `npm run vendor:bark-wasm` | Clone Bark WASM bindings into `packages/`. |
| `npm run build:bark-wasm` | `wasm-pack` build for SDK mode. |

## Data directories

| Path | Contents |
|------|----------|
| `~/.bark` (bark CLI) | barkd wallet datadir (created by `bark create`) |
| `.ark-wallet-data/` (app) | Encrypted sessions, pins, WebAuthn, nonces |
| Browser IndexedDB | Ed25519 vault (barkd mode) or SDK mnemonic / passkey vaults |

Reset app pairing only when intentional — deleting `pubkey-pins.enc.json` or `webauthn.enc.json` breaks existing device pairing for that barkd wallet.
