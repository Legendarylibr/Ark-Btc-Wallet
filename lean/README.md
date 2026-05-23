# Lean formal verification

Lean 4 models for **barkd mode** security (not the React UI; SDK is a separate trust model).

| Doc | [docs/formal-verification-lean.md](../docs/formal-verification-lean.md) |
| Toolchain | `leanprover/lean4:v4.14.0` |

## Prerequisites

```bash
curl https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh -sSf | sh
```

## Commands

```bash
npm run fv           # extract fixtures + lake build
npm run fv:extract   # regenerate ArkWallet/FvFixtures.lean
npm run fv:build     # cd lean && lake build
```

## Complete TypeScript → Lean map

The authoritative map lives in **`ArkWallet/Refinement/TSIndex.lean`** (`completeMap`: ~70 entries across tiers `core`, `route`, `guard`, `sdk`, `client`, `external`, `axiom`).

| Tier | TypeScript (examples) | Lean module |
|------|----------------------|-------------|
| **core** | `canonical.ts`, `nonce-store.ts`, `file-lock.ts`, `encrypted-file.ts`, `verify-pending-op-access.ts`, `webauthn/store.ts` | `Crypto/*`, `Auth/*`, `WebAuthn/*` |
| **guard** | `api-guard*.ts`, `middleware.ts`, `hardware-guard.ts` | `Routes/WalletOps`, `Routes/GuardMatrix`, `Routes/MiddlewareWallet` |
| **route** | all 22 `src/app/api/**/route.ts` | `Routes/AuthFlows`, `SetupFlows`, `WalletOps`, `Health`, `GuardMatrix` |
| **sdk** | `src/sdk/webauthn/**` | `Sdk/PasskeyChallenge` (+ axioms in `Obligations`) |
| **axiom** | Ed25519, WebAuthn server, barkd, vault KDF | `Refinement/Obligations` |

## Module tree (44 Lean files)

```text
lean/ArkWallet/
├── Prelude/Time.lean, Bytes.lean
├── Crypto/Canonical, Nonce, NonceStore, Challenge, ChallengeMessages, Ed25519,
│         SecureCompare, FileLock, EncryptedFile
├── Auth/Session, SessionBinding, VerifyRequest, PreSession, PubkeyPin,
│       SetupToken, UnlockToken
├── WebAuthn/PendingOp, PendingOpPaths, HardwareFresh, SetupGate,
│           CredentialStore, CreatorAccess
├── Inbound/Loopback, ApiGate
├── Routes/RouteId, MiddlewareWallet, Health, GuardMatrix,
│         AuthFlows, WalletOps, SetupFlows
├── Sdk/PasskeyChallenge.lean
├── World.lean
├── Refinement/Obligations.lean, TSIndex.lean
├── FvFixtures.lean          # auto-generated
└── Tests/Examples, Auth, Inbound, WebAuthn, Verify, Complete
```

## Global state (`World`)

```lean
structure World where
  sessions, nonces, challenges, pendingOps, pins
  setupTokens, unlockTokens
  webauthnCreds : CredentialStore
  encryptedFiles : EncryptedFileState
```

## What is verified

| Area | Refinement tests | Model |
|------|------------------|-------|
| `signingPath`, `canonicalRequest` | `Tests/Examples` | fixture `rfl` |
| `claimNonce` replay | `Tests/Examples` | `NonceStore` |
| `pendingOp` create/match/consume | `Tests/WebAuthn`, `Tests/Complete` | `PendingOp` |
| `verifyPendingOpCreatorAccess` | `Tests/Complete` | `CreatorAccess` |
| WebAuthn counter monotonicity | `Tests/Complete` | `CredentialStore` |
| Setup token options cooldown | `Tests/Complete` | `SetupToken` |
| File lock exclusivity | `Tests/Complete` | `FileLock` |
| Route guard matrix (22 routes) | `Tests/Complete` | `GuardMatrix` |
| SDK passkey op challenge payload | `Sdk/PasskeyChallenge` | payload string |
| `assertApiSecurity` | `Tests/Inbound` | `ApiGate` |
| `runSessionVerify` | `Tests/Verify` | control-flow model |

## Still axiomatic / out of scope

- Ed25519, WebAuthn server, barkd HTTP, browser vault, `:3535` bypass — `Refinement/Obligations.lean`
- Full SHA-256 for arbitrary bodies (fixture table in `FvFixtures`)
- SDK client-only WebAuthn (`obligation_sdk_mode`)

Regenerate `FvFixtures.lean` after changing mapped modules under `src/lib/crypto/*`, `src/lib/security/loopback.ts`, or `src/lib/webauthn/pending-op-paths.ts` (`npm run fv:extract`).
