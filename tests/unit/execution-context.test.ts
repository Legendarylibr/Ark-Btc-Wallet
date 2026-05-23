import { describe, expect, it } from "vitest";
import {
  assertSecureBrowserContext,
  InsecureExecutionContextError,
  isEmbeddedFrame,
  signingPermitted,
} from "@/lib/security/execution-context";

describe("execution context", () => {
  it("is not embedded in node test env", () => {
    expect(isEmbeddedFrame()).toBe(false);
    expect(() => assertSecureBrowserContext()).not.toThrow();
  });

  it("signing permitted only when not embedded", () => {
    expect(signingPermitted(false)).toBe(true);
    expect(signingPermitted(true)).toBe(false);
  });

  it("defines insecure execution error", () => {
    const err = new InsecureExecutionContextError("test");
    expect(err.name).toBe("InsecureExecutionContextError");
  });
});
