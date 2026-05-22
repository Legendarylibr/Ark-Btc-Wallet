# Lean formal verification

Lean 4 models for **barkd mode** security (not the React UI or SDK wallet).

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

## Module map (29 Lean files)

```text
lean/ArkWallet/
├── Prelude/Time.lean, Bytes.lean
├── Crypto/Canonical, Nonce, NonceStore, Challenge, ChallengeMessages, Ed25519, SecureCompare
├── Auth/Session, SessionBinding, VerifyRequest, PreSession, PubkeyPin, SetupToken, UnlockToken
├── WebAuthn/PendingOp, PendingOpPaths, HardwareFresh, SetupGate
├── Inbound/Loopback, ApiGate
├── Routes/RouteId, MiddlewareWallet, Health
├── World.lean
├── Refinement/Obligations.lean, TSIndex.lean
├── FvFixtures.lean          # auto-generated
└── Tests/Examples, Auth, Inbound, WebAuthn, Verify
```

## What is verified

| Area | Refinement tests | General proofs |
|------|------------------|----------------|
| `signingPath`, `canonicalRequest` | `Tests/Examples` | — |
| `isValidNonceUuid` | `Tests/Examples` | — |
| `claimNonce` replay | `Tests/Examples` | def only |
| `hashBody` | fixture inputs (`rfl`) | partial def |
| `isTimestampValid`, challenge messages | `Tests/Auth` | — |
| `pendingOpTypeForPath` | `Tests/WebAuthn` | — |
| `assertApiSecurity` | `Tests/Inbound` | compositional `def` |
| `runSessionVerify` | `Tests/Verify` | control-flow model |

## Still axiomatic / out of scope

- Ed25519, WebAuthn server, barkd HTTP, browser vault, `:3535` bypass — see `Refinement/Obligations.lean`
- SDK mode (`src/sdk/**`)
- Full SHA-256 for arbitrary bodies (fixture table only)

Regenerate `FvFixtures.lean` after changing mapped modules under `src/lib/crypto/*`, `src/lib/security/loopback.ts`, or `src/lib/webauthn/pending-op-paths.ts` (`npm run fv:extract`).
