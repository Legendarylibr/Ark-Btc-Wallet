import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { bytesToBase64, generateKeypair } from "@/lib/crypto/ed25519";
import { createSession } from "@/lib/crypto/session-store";
import { verifySignedRequest } from "@/lib/crypto/verify-request";
import { hashClientBinding } from "@/lib/client-binding";
import { useTempWalletDataDir } from "../helpers/env";
import { buildSignedWalletHeaders } from "../helpers/signing";

function clientBinding(): string {
  return hashClientBinding(
    new Request("http://127.0.0.1/", {
      headers: { "user-agent": "Vitest/ArkWallet" },
    }),
  );
}

describe("verifySignedRequest", () => {
  it("accepts valid signed GET with session", async () => {
    useTempWalletDataDir();
    const { publicKey, privateKey } = await generateKeypair();
    const publicKeyB64 = bytesToBase64(publicKey);
    const session = createSession(publicKeyB64, null, clientBinding());
    const headers = await buildSignedWalletHeaders({
      method: "GET",
      pathname: "/api/wallet/balance",
      body: "",
      privateKey,
      publicKeyB64,
      sessionId: session.id,
    });

    const req = new NextRequest("http://127.0.0.1:3000/api/wallet/balance", {
      method: "GET",
      headers,
    });

    const result = await verifySignedRequest(req, "");
    expect(result).not.toBeInstanceOf(Response);
    if (!(result instanceof Response)) {
      expect(result.sessionId).toBe(session.id);
    }
  });

  it("rejects replayed nonce", async () => {
    useTempWalletDataDir();
    const { publicKey, privateKey } = await generateKeypair();
    const publicKeyB64 = bytesToBase64(publicKey);
    const session = createSession(publicKeyB64, null, clientBinding());
    const headers = await buildSignedWalletHeaders({
      method: "GET",
      pathname: "/api/wallet/balance",
      privateKey,
      publicKeyB64,
      sessionId: session.id,
    });

    const req1 = new NextRequest("http://127.0.0.1:3000/api/wallet/balance", {
      method: "GET",
      headers,
    });
    expect(await verifySignedRequest(req1, "")).not.toBeInstanceOf(Response);

    const req2 = new NextRequest("http://127.0.0.1:3000/api/wallet/balance", {
      method: "GET",
      headers,
    });
    const replay = await verifySignedRequest(req2, "");
    expect(replay).toBeInstanceOf(Response);
    if (replay instanceof Response) {
      expect(replay.status).toBe(401);
      const body = await replay.json();
      expect(body.error).toMatch(/Replay/i);
    }
  });

  it("rejects invalid nonce format", async () => {
    useTempWalletDataDir();
    const { publicKey, privateKey } = await generateKeypair();
    const publicKeyB64 = bytesToBase64(publicKey);
    const session = createSession(publicKeyB64, null, clientBinding());
    const headers = await buildSignedWalletHeaders({
      method: "GET",
      pathname: "/api/wallet/balance",
      privateKey,
      publicKeyB64,
      sessionId: session.id,
    });
    headers.set("x-wallet-nonce", "not-uuid");

    const req = new NextRequest("http://127.0.0.1:3000/api/wallet/balance", {
      method: "GET",
      headers,
    });
    const res = await verifySignedRequest(req, "");
    expect(res).toBeInstanceOf(Response);
    if (res instanceof Response) expect(res.status).toBe(401);
  });

  it("rejects body hash mismatch", async () => {
    useTempWalletDataDir();
    const { publicKey, privateKey } = await generateKeypair();
    const publicKeyB64 = bytesToBase64(publicKey);
    const session = createSession(publicKeyB64, null, clientBinding());
    const headers = await buildSignedWalletHeaders({
      method: "GET",
      pathname: "/api/wallet/balance",
      body: "",
      privateKey,
      publicKeyB64,
      sessionId: session.id,
    });
    headers.set("x-wallet-body-hash", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");

    const req = new NextRequest("http://127.0.0.1:3000/api/wallet/balance", {
      method: "GET",
      headers,
    });
    const res = await verifySignedRequest(req, "");
    expect(res).toBeInstanceOf(Response);
    if (res instanceof Response) {
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toMatch(/Body hash/i);
    }
  });

  it("rejects session binding mismatch", async () => {
    useTempWalletDataDir();
    const { publicKey, privateKey } = await generateKeypair();
    const publicKeyB64 = bytesToBase64(publicKey);
    const session = createSession(publicKeyB64, null, clientBinding());
    const headers = await buildSignedWalletHeaders({
      method: "GET",
      pathname: "/api/wallet/balance",
      privateKey,
      publicKeyB64,
      sessionId: session.id,
      extraHeaders: { "user-agent": "Different-Agent/2" },
    });
    // binding hash changes when user-agent differs from session creation

    const req = new NextRequest("http://127.0.0.1:3000/api/wallet/balance", {
      method: "GET",
      headers,
    });
    const res = await verifySignedRequest(req, "");
    expect(res).toBeInstanceOf(Response);
    if (res instanceof Response) {
      const body = await res.json();
      expect(body.error).toMatch(/binding/i);
    }
  });
});
