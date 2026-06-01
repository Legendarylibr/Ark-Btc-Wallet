# Ark BTC Wallet

A local, Cash App–style wallet for **Ark-only signet** payments. Send and receive using `ark1…` addresses with instant settlement on the [2nd signet](https://signet.2nd.dev/) network.

**Who is this for?** Developers and testers who want a simple UI on top of [barkd](https://second.tech/docs/barkd) (recommended), or a barkd-free in-browser wallet via Second's [`@secondts/bark`](https://www.npmjs.com/package/@secondts/bark) WASM SDK.

[![CI](https://github.com/Legendarylibr/Ark-Btc-Wallet/actions/workflows/ci.yml/badge.svg)](https://github.com/Legendarylibr/Ark-Btc-Wallet/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## What you get

- **Pay & Request** — send signet sats to any `ark1…` address; show a receive address for incoming payments
- **Live balance & history** — auto-sync through barkd or the browser SDK; activity list in the UI
- **Secure** — refresh received VTXOs after someone pays you (recommended after incoming funds)
- **Strong local security (barkd mode)** — passphrase + security key (Touch ID, Windows Hello, YubiKey) + signed API on loopback only
- **No cloud account** — runs on your machine at `http://127.0.0.1:3000`; keys stay in barkd unless you enable SDK mode

> **Signet only** — this is test money, not mainnet. Get coins from the [signet faucet](https://signet.2nd.dev/).

---

## How it works (two modes)

| | **barkd (default, recommended)** | **SDK (barkd-free browser wallet)** |
|---|----------------------------------|----------------------|
| Where keys live | **barkd** on your computer (`127.0.0.1:3535`) | Browser (WASM + encrypted storage) |
| Recovery phrase in UI? | **No** — created only in `bark create` | Yes (shown once at setup; back it up) |
| Security key | Verified on the **server** | Verified in the **browser** only |
| Local daemon required? | Yes, `barkd` | No |
| Still needs hosted services? | Ark server + esplora | Ark server + esplora |
| Best for | Day-to-day signet testing with stronger local isolation | Demos, browser-first testing, machines where installing barkd is impractical |

Use **barkd mode** when you want stronger local isolation. Use **SDK mode** when the priority is a no-daemon browser wallet. SDK has a different trust model — read [SECURITY.md](SECURITY.md) before using it.

---

## Before you start

| Requirement | Notes |
|-------------|--------|
| **Node.js 20+** | [nodejs.org](https://nodejs.org) — for the wallet UI |
| **Bark CLI + barkd** | Required for barkd mode only. [Install guide](https://second.tech/docs/barkd/install) |
| **Modern browser** | Chrome, Firefox, Edge, or Safari — for WebAuthn |
| **Security key (optional)** | Touch ID, Windows Hello, or a FIDO2 key (e.g. YubiKey) |

The wallet UI **only listens on loopback** (`127.0.0.1`). Do not expose ports `3000` or `3535` to your LAN or the internet.

---

## Quick start (about 10 minutes)

### Step 1 — Create a signet wallet (terminal, one time)

Your **bitcoin recovery phrase is created here**, not in the browser. Write it down and store it safely.

```bash
bark create --signet \
  --ark ark.signet.2nd.dev \
  --esplora esplora.signet.2nd.dev
```

### Step 2 — Start barkd

Keep this running in a terminal while you use the wallet:

```bash
barkd
```

Default API: `http://127.0.0.1:3535`. Use loopback only — do not bind barkd to `0.0.0.0`.

Check it is up (optional):

```bash
curl -s http://127.0.0.1:3535/api/v1/wallet
```

You should see a wallet `fingerprint` in the JSON response.

### Step 3 — Install and run Ark BTC Wallet

**macOS / Linux:**

```bash
git clone https://github.com/Legendarylibr/Ark-Btc-Wallet.git
cd Ark-Btc-Wallet
cp .env.example .env.local
npm install
npm run dev
```

**Windows (PowerShell):**

```powershell
git clone https://github.com/Legendarylibr/Ark-Btc-Wallet.git
cd Ark-Btc-Wallet
copy .env.example .env.local
npm install
npm run dev
```

Open **[http://127.0.0.1:3000](http://127.0.0.1:3000)** in your browser. Prefer this exact URL (not only `localhost`) so passkeys and WebAuthn stay consistent — see [docs/platforms.md](docs/platforms.md).

### Step 4 — Set up the app (first time only)

The UI walks you through these screens in order:

1. **Onboarding** — confirms barkd is reachable; tap *I started barkd — continue*.
2. **Passphrase** — protects your **UI signing key** (encrypted in the browser). This is **not** your bitcoin mnemonic from `bark create`.
3. **Register hardware** — enroll Touch ID, Windows Hello, or a YubiKey.
4. **Unlock** — enter passphrase and approve with your security key.

The first machine to unlock **pairs** with this barkd wallet. Another computer with a different signing key will be blocked until you reset pairing ([troubleshooting](docs/troubleshooting.md)).

### Step 5 — Get test coins

1. Tap **Request** and copy your `ark1…` address.
2. Paste it into the [signet faucet](https://signet.2nd.dev/) (GitHub login).
3. Wait for sync — balance and activity should update automatically.

### Step 6 — Use the wallet

| Button | What it does |
|--------|----------------|
| **Pay** | Send to an `ark1…` address. Requires a fresh security-key tap. |
| **Request** | Show your receive address. |
| **Secure** | Refresh incoming VTXOs after you receive funds. |
| **Lock** | End session and clear the signing key from memory. |

---

## Platform notes

### macOS

Install barkd per [upstream docs](https://second.tech/docs/barkd/install), then run the commands in Quick start. **Touch ID** or a **YubiKey** works for WebAuthn.

### Linux

Same flow as macOS. **Chrome** or **Firefox** recommended; **YubiKey** works on all distros.

### Windows

**Option A** — Native barkd (if you have a Windows build from the install guide):

```powershell
bark create --signet --ark ark.signet.2nd.dev --esplora esplora.signet.2nd.dev
barkd
```

**Option B** — barkd in **WSL2** (common): run `bark create` and `barkd` inside Ubuntu/WSL. Keep `BARKD_URL=http://127.0.0.1:3535` in `.env.local` — the Windows browser reaches WSL on loopback.

Use **Windows Hello** or a **YubiKey** when the app asks for your security key.

More detail: [docs/platforms.md](docs/platforms.md)

---

## SDK mode (barkd-free)

For a browser-only wallet where the app runs Bark through `@secondts/bark` WASM:

1. Install dependencies: `npm install` includes Second's browser Bark SDK (`@secondts/bark`).
2. In `.env.local` set `NEXT_PUBLIC_WALLET_BACKEND=sdk`.
3. Restart `npm run dev`.

No local `barkd` process is required. The browser still connects to Second's signet Ark server and esplora endpoints. Back up the mnemonic shown during SDK wallet creation; it is the recovery material for this mode.

Treat SDK as a **different trust model** — not a drop-in replacement for barkd security. Full guide: [docs/sdk-mode.md](docs/sdk-mode.md).

---

## Something went wrong?

| Symptom | Try |
|---------|-----|
| “Start barkd…” on open | Run `barkd` in a terminal; check `curl` above. |
| WebAuthn / passkey fails | Use `http://127.0.0.1:3000` consistently; try another browser. |
| Unlock rejected / pairing error | First device wins pairing; see [docs/troubleshooting.md](docs/troubleshooting.md). |
| Balance not updating | Tap refresh; run **Secure** after a receive. |

Full list: [docs/troubleshooting.md](docs/troubleshooting.md)

---

## Security (plain language)

- **barkd holds your coins** — any program on your PC can talk to `127.0.0.1:3535` while barkd runs. Stop barkd when idle; keep it on loopback.
- **The UI adds a second lock** — passphrase, signed requests, and a security key for pay / secure / balance reads.
- **No telemetry** — the app does not phone home with keys or transaction data.
- **Production** — set a strong `SESSION_SECRET` and `BARKD_AUTH_TOKEN`; see [docs/configuration.md](docs/configuration.md) and [SECURITY.md](SECURITY.md).
- **Optional strict retention** — `ARK_ZERO_RETENTION=true` shortens sessions and purges ephemeral server data; see [docs/zero-trust-retention.md](docs/zero-trust-retention.md).

---

## Documentation

| Doc | When to read it |
|-----|-----------------|
| [docs/getting-started.md](docs/getting-started.md) | Full barkd walkthrough, Pay / Secure details |
| [docs/platforms.md](docs/platforms.md) | OS-specific tips, WebAuthn, WSL |
| [docs/sdk-mode.md](docs/sdk-mode.md) | Barkd-free browser wallet, passkeys, recovery passphrase |
| [docs/configuration.md](docs/configuration.md) | All environment variables |
| [docs/architecture.md](docs/architecture.md) | How signing and backends fit together |
| [docs/troubleshooting.md](docs/troubleshooting.md) | Errors and fixes |
| [SECURITY.md](SECURITY.md) | Trust boundaries and incident response |
| [docs/formal-verification-lean.md](docs/formal-verification-lean.md) | Lean 4 map and proof plan |
| [lean/README.md](lean/README.md) | Formal verification (phase 0) |
| [docs/zero-trust-retention.md](docs/zero-trust-retention.md) | Zero-trust and data retention mode |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Hacking on the repo |

---

## Development

```bash
npm install
npm run dev          # http://127.0.0.1:3000
npm test             # unit tests
npm run fv           # Lean formal verification (extract fixtures + lake build)
npm run lint
npm run build        # production build (needs SESSION_SECRET + BARKD_AUTH_TOKEN in env)
```

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` / `npm run start` | Production build and server |
| `npm test` | Vitest (170+ unit tests) |
| `npm run lockdown:local` | Hints to lock down local ports |

---

## License

[MIT](LICENSE)
