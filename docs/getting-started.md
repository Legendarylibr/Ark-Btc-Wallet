# Getting started (barkd mode)

This is the **recommended** setup: bitcoin and Ark keys live in **barkd** on your machine; the web app only gates access with a passphrase, Ed25519 request signing, and WebAuthn.

## What you need

- **Node.js** 20+
- **[Bark CLI + barkd](https://second.tech/docs/barkd/install)** on signet
- A modern browser with **WebAuthn** (Touch ID, Windows Hello, or a FIDO2 key like YubiKey)

## 1. Create a signet wallet (CLI only)

The recovery phrase is created here — **not** in the browser:

```bash
bark create --signet \
  --ark ark.signet.2nd.dev \
  --esplora esplora.signet.2nd.dev
```

Back up the mnemonic bark prints. Store it offline.

## 2. Start barkd on loopback

```bash
barkd
```

Default API: `http://127.0.0.1:3535`. Do **not** bind barkd to `0.0.0.0` on a network-facing machine.

Verify:

```bash
curl -s http://127.0.0.1:3535/api/v1/wallet
```

You should see a wallet `fingerprint` when the daemon is ready.

## 3. Run Ark BTC Wallet

```bash
git clone https://github.com/Legendarylibr/Ark-Btc-Wallet.git
cd Ark-Btc-Wallet
cp .env.example .env.local
npm install
npm run dev
```

Open **http://127.0.0.1:3000** (the dev server only listens on loopback). Use this URL consistently so WebAuthn/passkeys stay valid (see [platforms.md](platforms.md)).

## 4. First-time setup in the app

Follow the UI in order:

1. **Onboarding** — confirm barkd is running.
2. **Passphrase** — creates an Ed25519 **UI signing key** (encrypted in the browser). This is *not* your bitcoin mnemonic; it cannot spend without barkd + WebAuthn.
3. **Register hardware** — enroll Touch ID / YubiKey / Windows Hello (server-verified).
4. **Unlock** — passphrase + hardware tap to open a signed session to the API.

The first device to unlock **pins** its public key to this barkd fingerprint. A second machine with a different signing key will be rejected until you reset pairing (see [Troubleshooting](troubleshooting.md)).

## 5. Get signet sats

1. Tap **Request** and copy your `ark1…` address.
2. Use the [signet faucet](https://signet.2nd.dev/) (GitHub login).
3. Balance updates after sync (automatic polling).

## 6. Pay and secure

| Action | What it does |
|--------|----------------|
| **Pay** | Send to another `ark1…` address. Requires a **fresh hardware tap** per payment. |
| **Request** | Show receive address (stable index `0` until you rotate). |
| **Secure** | Refresh received VTXOs for stronger trust — use after incoming payments. |
| **New address** | Rotate receive index (hardware tap). |
| **Lock** (logout) | Clears signing key in memory and server session. |

Fees are estimated conservatively from barkd’s Ark fee tiers before send.

## Production notes

- Set `SESSION_SECRET` to a long random string (≥32 chars). See [Configuration](configuration.md).
- Run `npm run build && npm run start` — still binds `127.0.0.1`.
- Read [SECURITY.md](../SECURITY.md) before exposing anything beyond localhost.

## Next

- [SDK mode](sdk-mode.md) if you need a daemon-free browser wallet (different trust model).
- [Architecture](architecture.md) for how signing and API routes work.
