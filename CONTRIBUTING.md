# Contributing

Thanks for helping improve [Ark BTC Wallet](https://github.com/Legendarylibr/Ark-Btc-Wallet).

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

- **barkd mode:** install [Bark + barkd](https://second.tech/docs/barkd/install), run `barkd` on signet. See [docs/getting-started.md](docs/getting-started.md).
- **SDK mode:** `npm run vendor:bark-wasm && npm run build:bark-wasm`, then `NEXT_PUBLIC_WALLET_BACKEND=sdk` in `.env.local`. See [docs/sdk-mode.md](docs/sdk-mode.md).

## Before you open a PR

```bash
npm run lint
npm test
npm run build
```

CI runs the same checks on GitHub Actions.

## Project layout

```
src/
  app/              Next.js routes (pages + /api/*)
  components/       WalletApp, SdkWalletApp, sheets, onboarding
  lib/              barkd client, crypto, WebAuthn (server), API guards
  sdk/              Browser WASM wallet, passkey vault, SDK WebAuthn
  store/            Zustand (crypto, wallet, sdk-wallet)
tests/unit/         Vitest — prefer tests for security-sensitive logic
docs/               User and operator guides
packages/bark-wasm/          WASM package; `npm run vendor:bark-wasm` clones upstream bindings beside it when building SDK
```

Barkd-only work does not need a WASM build. SDK mode runs `npm run vendor:bark-wasm` (clones bindings via Git) then `npm run build:bark-wasm`.

| Change type | Also update |
|-------------|-------------|
| Threat model / auth behavior | [SECURITY.md](SECURITY.md) |
| Env vars or deploy | [docs/configuration.md](docs/configuration.md), [.env.example](.env.example) |
| User-facing flows | [docs/getting-started.md](docs/getting-started.md) or [docs/troubleshooting.md](docs/troubleshooting.md) |

## Code style

- Match existing patterns: minimal scope, no drive-by refactors.
- API routes: use `withCryptoGuard` / `withSensitiveCryptoGuard` and `parseJsonBody`.
- Add or extend `tests/unit/api-routes.test.ts` when changing route behavior (handlers are invoked directly with mocked `barkd`).
- E2E: `npm run test:e2e:install` once, then `npm run build && npm run test:e2e` (starts `next start` in CI). Smoke tests live in `tests/e2e/`.
- Security-sensitive helpers belong in `src/lib/crypto/` or `src/lib/webauthn/`.

## Security issues

Do **not** file public issues for exploitable vulnerabilities. Report privately to the maintainers (GitHub private security advisory or contact on the repo profile when listed).

## Questions

Open a [GitHub issue](https://github.com/Legendarylibr/Ark-Btc-Wallet/issues) for bugs and feature requests. Check [docs/troubleshooting.md](docs/troubleshooting.md) first.
