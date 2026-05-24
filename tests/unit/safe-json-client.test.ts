import { describe, expect, it } from "vitest";
import { parseJsonBody, readResponseJson } from "@/lib/safe-json";
import { hashClientBinding } from "@/lib/client-binding";
import { ARK_CLIENT_HEADER, ARK_CLIENT_VALUE } from "@/lib/ark-client";

describe("safe-json", () => {
  it("parseJsonBody rejects empty and invalid JSON", () => {
    expect(parseJsonBody("").ok).toBe(false);
    expect(parseJsonBody("{bad").ok).toBe(false);
    expect(parseJsonBody("null").ok).toBe(false);
    expect(parseJsonBody('{"a":1}').ok).toBe(true);
  });

  it("readResponseJson returns null for non-JSON bodies", async () => {
    const res = new Response("<html>error</html>", {
      status: 502,
      headers: { "content-type": "text/html" },
    });
    expect(await readResponseJson(res)).toBeNull();
  });

  it("readResponseJson parses JSON responses", async () => {
    const res = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    expect(await readResponseJson<{ ok: boolean }>(res)).toEqual({ ok: true });
  });
});

describe("client-binding", () => {
  it("hashes user-agent into binding", () => {
    const a = hashClientBinding(
      new Request("http://localhost/", {
        headers: { "user-agent": "Ark/1" },
      }),
    );
    const b = hashClientBinding(
      new Request("http://localhost/", {
        headers: { "user-agent": "Other/1" },
      }),
    );
    expect(a).not.toBe(b);
    expect(a.length).toBe(64);
  });
});

describe("ark-client", () => {
  it("exports stable header constants", () => {
    expect(ARK_CLIENT_HEADER).toBe("x-ark-client");
    expect(ARK_CLIENT_VALUE).toBe("ark-wallet/1");
  });
});
