# Security

Operator setup and env vars: [docs/configuration.md](docs/configuration.md). User-facing flows: [docs/getting-started.md](docs/getting-started.md). **Zero trust / zero retention:** [docs/zero-trust-retention.md](docs/zero-trust-retention.md).

## Trust boundaries

### barkd mode (recommended)

1. **barkd** (`127.0.0.1:3535`) — holds bitcoin / Ark keys. Any local process can call its HTTP API while it runs.
2. **This app** — Ed25519-signed proxy to barkd. Passphrase encrypts the **UI signing key** in IndexedDB.
3. **Your OS** — root of trust.

### SDK mode

Enable with `NEXT_PUBLIC_WALLET_BACKEND=sdk`. **Blocked in production** unless `ALLOW_SDK_IN_PRODUCTION=true`. **Do not assume barkd-mode guarantees apply.**

| Topic | barkd | SDK |
|-------|-------|-----|
| Keys | barkd process | Browser (WASM + IndexedDB) |
| Mnemonic in UI | No | Yes |
| WebAuthn | Server-verified | Client-only |
| Typical bypass | Direct `:3535` HTTP | XSS / malware while unlocked |

Passkey (PRF) mode requires a **recovery passphrase** at create. Pay / Secure / rotate need a fresh passkey tap. Legacy passphrase path uses confirm-on-pay WebAuthn only.

## Production requirements

| Setting | Requirement |
|---------|-------------|
| `BARKD_URL` | Loopback only (`127.0.0.1` / `localhost`) |
| `SESSION_SECRET` | ≥32 random characters |
| `npm run dev` / `start` | Binds **127.0.0.1** |
| barkd | Listen on loopback — never `0.0.0.0:3535` |

**Never enable:** `ALLOW_REMOTE_HOST=true` in production (startup aborts). Do not expose ports **3000** or **3535** to the LAN/internet.

## In-app controls (barkd)

- Ed25519 + UUID v4 nonces on `/api/wallet/*` (nonces persisted across restart)
- Middleware rejects malformed session cookies / nonces before handlers run
- Server WebAuthn on unlock, pay, fee estimate, secure, rotate (pending-op body binding + credential ID match)
- Loopback Host/Origin, `x-ark-client`, block `Sec-Fetch-Site: cross-site` and `Sec-Fetch-Dest: document` on API POSTs
- Production mutations require `Sec-Fetch-Site: same-origin` (override with `RELAX_FETCH_SITE=true`)
- Balance / history / receive address require **recent WebAuthn** (same window as auto-lock)
- `POST /api/wallet/sync` only triggers barkd sync — **no balance in the response** (use read-protected GET balance)
- Register challenges and setup tokens persist encrypted on disk (survive restart)
- Persisted pending ops, WebAuthn challenges, and rate limits across restarts (disk-authoritative under file lock — safe across multiple Node workers sharing `.ark-wallet-data`)
- Session binding (IP + User-Agent) set at register; **destroy session** on mismatch (no lazy bind)
- Unlock failures require a single-use token from `unlock-check`, bound to client fingerprint (blocks blind `unlock-failed` spam)
- `GET /api/health` reports **daemon reachability only** (not whether a barkd wallet file exists)
- `POST /api/auth/barkd-ready` requires **unlock-check token** + pre-session Ed25519; before pairing returns **daemon reachability only** (no `walletStatus`); after pubkey pin requires **matching signing key** + wallet file check; public `GET /api/wallet/ready` is deprecated (410)
- WebAuthn **register-options** / **setup-proof** use uniform 401 errors until vault proof is valid (no `walletExists` oracle on register-options)
- **auth-options** resolves pending `opId` before barkd; uniform **401** for missing op / barkd / credential (no 503 fingerprint probe)
- Page **CSP uses per-request nonces** (no `script-src 'unsafe-inline'`)
- Barkd hardware registration flag stored in IndexedDB (avoids routine unauthenticated status probes)
- Server session **8h max** + **30 min idle** (re-unlock required)
- API body cap **64 KiB**; `TRACE`/`TRACK` blocked
- Production `SESSION_SECRET` min **32** chars; rejects known placeholders
- Client auto-lock after 5 minutes idle
- Pubkey pin per barkd fingerprint; setup token anti-squat for WebAuthn register
- Optional **`ARK_ZERO_RETENTION=true`**: short TTLs + purge ephemeral server state on first API request and logout (see [docs/zero-trust-retention.md](docs/zero-trust-retention.md))
- No logging of request bodies, passphrases, or mnemonics

Hardware gates the **web UI**, not barkd itself — **`BARKD_AUTH_TOKEN` is required in production** (barkd mode) unless `ALLOW_INSECURE_BARKD=true` for signet-only dev.

## barkd bypass (out of scope for this app)

Any local process can call `http://127.0.0.1:3535` while barkd runs. Mitigate with loopback-only barkd, `npm run lockdown:local`, and stopping barkd when idle. For recovery, use `bark` / barkd CLI directly.

## Data on disk

`.ark-wallet-data/` (mode `700`): encrypted `sessions`, `nonces`, `unlock-limits`, `unlock-attempt-tokens`, `unlock-token-bindings`, `pubkey-pins`, `webauthn`.

## Incident response

- **Stolen session cookie** — Lock wallet; remove `sessions.enc.json`; unlock again.
- **Wrong device paired** — Use original device or reset `.ark-wallet-data` intentionally.
- **Suspected malware** — Stop barkd; move funds via `bark` on a clean machine.
