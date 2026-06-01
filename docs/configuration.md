# Configuration

Copy [.env.example](../.env.example) to `.env.local` for local development.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_WALLET_BACKEND` | `barkd` | `barkd` (recommended) or `sdk` (barkd-free browser WASM). Public — baked into client bundle. |
| `ALLOW_SDK_IN_PRODUCTION` | `false` | Must be `true` to run `npm run start` with SDK backend in production. |
| `BARKD_URL` | `http://127.0.0.1:3535` | barkd REST base URL. **Must be loopback** — enforced at runtime. |
| `SESSION_SECRET` | — | **Required in production** (≥32 random chars). Encrypts `.ark-wallet-data/*`. |
| `STRICT_FETCH_SITE` | prod default | Force `Sec-Fetch-Site: same-origin` on mutations (also default in production). |
| `RELAX_FETCH_SITE` | `false` | If `true`, allows `same-site` mutations in production. |
| `WALLET_DATA_DIR` | `.ark-wallet-data` | Server-side encrypted state directory. |
| `BARKD_AUTH_HEADER` | `Authorization` | Header name when `BARKD_AUTH_TOKEN` is set. |
| `BARKD_AUTH_TOKEN` | — | **Required in production** (barkd mode) unless `ALLOW_INSECURE_BARKD=true`. |
| `ALLOW_INSECURE_BARKD` | `false` | Signet/dev only: skip fatal when `BARKD_AUTH_TOKEN` is unset. |
| `ARK_SERVER` | `https://ark.signet.2nd.dev` | Ark server (signet). |
| `ESPLORA_URL` | `https://esplora.signet.2nd.dev` | Esplora (signet). |
| `NEXT_PUBLIC_ARK_SERVER` | `https://ark.signet.2nd.dev` | Browser SDK Ark server. Public — baked into client bundle. HTTPS only. |
| `NEXT_PUBLIC_ESPLORA_URL` | `https://esplora.signet.2nd.dev` | Browser SDK chain source. Public — baked into client bundle. HTTPS only. |
| `BARK_NETWORK` | `signet` | Network label. |
| `TRUST_PROXY` | `false` | If `true`, use `X-Forwarded-For` / `X-Real-IP` for rate limits and session binding. |
| `ALLOW_REMOTE_HOST` | `false` | If `true`, disables loopback Host/Origin checks. **Fatal in production startup.** |
| `ENABLE_HSTS` | `false` | Adds Strict-Transport-Security and CSP upgrade when behind HTTPS. |
| `ARK_ZERO_RETENTION` | `false` | Short server TTLs; purge ephemeral `.ark-wallet-data` on startup and logout. |
| `ZERO_DATA_RETENTION` | `false` | Alias for `ARK_ZERO_RETENTION`. |
| `NEXT_PUBLIC_ARK_ZERO_RETENTION` | `false` | Clear browser caches / SDK sessionStorage on lock (client build flag). |

## SDK mode checklist

SDK mode ignores `BARKD_URL`, `BARKD_AUTH_HEADER`, and `BARKD_AUTH_TOKEN` for wallet operations. It still uses the Next.js app process for the UI and connects from the browser to the Ark server and esplora.

1. Set `NEXT_PUBLIC_WALLET_BACKEND=sdk`.
2. Run `npm install` so `@secondts/bark` is present.
3. Restart `npm run dev`, or rebuild for production.
4. Back up the SDK mnemonic shown during wallet creation.
5. Use one browser origin consistently, preferably `http://127.0.0.1:3000`.
6. Optionally set `NEXT_PUBLIC_ARK_SERVER` and `NEXT_PUBLIC_ESPLORA_URL` to trusted/self-hosted HTTPS endpoints.
7. For production, set `ALLOW_SDK_IN_PRODUCTION=true` only when browser-held wallet material is intentional.

## Production checklist

1. `SESSION_SECRET` — generate with e.g. `openssl rand -base64 32`.
2. Keep `ALLOW_REMOTE_HOST` unset or `false`.
3. Run `npm run build && npm run start` (binds `127.0.0.1:3000`).
4. barkd on loopback only; stop when not in use.
5. Set `BARKD_AUTH_TOKEN` (required in production for barkd mode, unless `ALLOW_INSECURE_BARKD=true`).
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
| `npm install` | Install app dependencies, including Second's browser Bark SDK (`@secondts/bark`). |
| `npm run lockdown:local` | Print firewall / port-check hints for your OS. |

## Data directories

| Path | Contents |
|------|----------|
| `~/.bark` (bark CLI) | barkd wallet datadir (created by `bark create`) |
| `.ark-wallet-data/` (app) | Encrypted sessions, pins, WebAuthn, nonces, pending ops |
| Browser IndexedDB | Ed25519 vault (barkd mode) or SDK mnemonic / passkey vaults |

Reset app pairing only when intentional — deleting `pubkey-pins.enc.json` or `webauthn.enc.json` breaks existing device pairing for that barkd wallet.

### `WALLET_DATA_DIR` and multiple processes

- Set `WALLET_DATA_DIR` to an absolute path on **local disk** (default: `.ark-wallet-data` under the app cwd).
- **One host** may run several Node workers (e.g. PM2) against the **same** directory; `src/lib/file-lock.ts` exclusive locks prevent corrupting encrypted JSON during concurrent writes.
- **Do not** point multiple machines or containers at the same directory over the network.
- Prefer a single Next.js process unless you need clustering — see [architecture.md](architecture.md#deployment-assumptions).
