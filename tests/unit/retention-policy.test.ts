import { afterEach, describe, expect, it } from "vitest";
import {
  isZeroRetentionMode,
  retentionNonceTtlMs,
  retentionSessionIdleMs,
  retentionSessionTtlMs,
} from "@/lib/security/retention-policy";

describe("retention-policy", () => {
  const prev = process.env.ARK_ZERO_RETENTION;

  afterEach(() => {
    if (prev === undefined) delete process.env.ARK_ZERO_RETENTION;
    else process.env.ARK_ZERO_RETENTION = prev;
  });

  it("uses default TTLs when flag unset", () => {
    delete process.env.ARK_ZERO_RETENTION;
    delete process.env.ZERO_DATA_RETENTION;
    expect(isZeroRetentionMode()).toBe(false);
    expect(retentionSessionTtlMs()).toBe(8 * 60 * 60 * 1000);
    expect(retentionSessionIdleMs()).toBe(30 * 60 * 1000);
    expect(retentionNonceTtlMs()).toBe(10 * 60 * 1000);
  });

  it("shortens TTLs when ARK_ZERO_RETENTION=true", () => {
    process.env.ARK_ZERO_RETENTION = "true";
    expect(isZeroRetentionMode()).toBe(true);
    expect(retentionSessionTtlMs()).toBe(2 * 60 * 60 * 1000);
    expect(retentionSessionIdleMs()).toBe(5 * 60 * 1000);
    expect(retentionNonceTtlMs()).toBe(3 * 60 * 1000);
  });
});
