# Linux, macOS, and Windows

Ark BTC Wallet is a **Node.js + browser** app. The UI runs on all three platforms. In barkd mode, **barkd** is installed separately per OS; in SDK mode, Bark runs in the browser through `@secondts/bark` and no local daemon is required.

## Requirements (all platforms)

| Tool | Version | Used for |
|------|---------|----------|
| Node.js | 20+ | Dev server, build, tests |
| npm | 9+ | Dependencies |
| Modern browser | Chrome, Edge, Firefox, Safari | WebAuthn + UI |
| Git | any recent | Cloning the repository |

## Quick start (any OS)

```bash
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm install
npm run dev
```

Open **http://127.0.0.1:3000** (not only `localhost` on first setup — keeps WebAuthn `rpId` consistent).

Works in **PowerShell**, **cmd**, **Git Bash** (Windows), and Unix shells.

## barkd by platform

Install from [Bark / barkd docs](https://second.tech/docs/barkd/install) for your OS when using the default barkd mode. Skip this section for SDK mode.

| Platform | Notes |
|----------|--------|
| **macOS** | Native or Homebrew install per upstream; run `barkd` in Terminal. |
| **Linux** | Use upstream packages/binaries; ensure `127.0.0.1:3535` is reachable. |
| **Windows** | Use upstream Windows build or WSL2 with barkd bound to `127.0.0.1`. From Windows browser, `BARKD_URL=http://127.0.0.1:3535` reaches WSL via forwarded loopback. |

Create wallet (all platforms):

```bash
bark create --signet --ark ark.signet.2nd.dev --esplora esplora.signet.2nd.dev
barkd
```

## SDK / WASM (barkd-free, all platforms)

SDK mode uses Second's published browser WASM package, `@secondts/bark`, installed by `npm install`. You do not need Rust, `wasm-pack`, Bark CLI, or `barkd` unless you are developing the Bark bindings themselves or using barkd mode.

Set this in `.env.local` and restart the dev server:

```bash
NEXT_PUBLIC_WALLET_BACKEND=sdk
```

## WebAuthn / passkeys

| Platform | Typical authenticator |
|----------|----------------------|
| macOS | Touch ID, YubiKey |
| Windows | Windows Hello, YubiKey |
| Linux | YubiKey, platform tokens where supported |

Use **Chrome**, **Edge**, or **Firefox** on Linux for best WebAuthn support.

## Paths and data

| Data | Location |
|------|----------|
| App server state | `.ark-wallet-data/` in project dir (or `WALLET_DATA_DIR`) |
| barkd wallet | `~/.bark` (OS user home; barkd mode only) |
| Browser vault | IndexedDB in your browser profile; SDK mode stores mnemonic/passkey vaults here |

On Windows, `path.join` and Node `fs` handle paths; `.ark-wallet-data` lives next to the repo.

## Firewall helper

```bash
npm run lockdown:local
```

Prints OS-specific commands to verify ports **3000** and **3535** stay local.

## CI

GitHub Actions runs **lint**, **test**, and **build** on Ubuntu, Windows, and macOS for every push to `main`.

## Troubleshooting

- **“barkd not reachable” on Windows + WSL** — run `barkd` in WSL; keep `BARKD_URL=http://127.0.0.1:3535`.
- **WebAuthn fails after switching host** — stay on `127.0.0.1:3000` or `localhost:3000`, not both across sessions.
- **Scripts fail on Windows** — use Node 20+ from [nodejs.org](https://nodejs.org); project scripts run through npm and TypeScript via `tsx`.

See [troubleshooting.md](troubleshooting.md) for more.
