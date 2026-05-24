// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assertWebAuthnAvailable } from "@/lib/webauthn/availability";

describe("assertWebAuthnAvailable", () => {
  let original: typeof PublicKeyCredential | undefined;

  beforeEach(() => {
    original = globalThis.PublicKeyCredential;
    if (!original) {
      globalThis.PublicKeyCredential =
        class {} as typeof PublicKeyCredential;
    }
  });

  afterEach(() => {
    if (original) {
      globalThis.PublicKeyCredential = original;
    } else {
      // @ts-expect-error restore missing API for other tests
      delete globalThis.PublicKeyCredential;
    }
  });

  it("does not throw when PublicKeyCredential exists", () => {
    expect(() => assertWebAuthnAvailable()).not.toThrow();
  });

  it("throws when PublicKeyCredential is missing", () => {
    // @ts-expect-error test stub
    delete globalThis.PublicKeyCredential;
    expect(() => assertWebAuthnAvailable()).toThrow(
      /WebAuthn is not available/,
    );
  });
});
