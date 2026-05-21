import { describe, expect, it } from "vitest";
import { isValidArkAddress } from "@/lib/ark-address";
import { isArkAddress, truncateAddress } from "@/lib/utils";

describe("ark-address", () => {
  it("rejects non-ark and malformed addresses", () => {
    expect(isValidArkAddress("bc1qtest")).toBe(false);
    expect(isValidArkAddress("ark1")).toBe(false);
    expect(isValidArkAddress("ark1!!!")).toBe(false);
    expect(isValidArkAddress("")).toBe(false);
  });

  it("isArkAddress delegates to validator", () => {
    expect(isArkAddress("not-ark")).toBe(false);
  });
});

describe("truncateAddress", () => {
  it("shortens long addresses", () => {
    const addr = "ark1" + "q".repeat(40);
    const out = truncateAddress(addr, 8, 6);
    expect(out).toContain("…");
    expect(out.length).toBeLessThan(addr.length);
  });

  it("returns short addresses unchanged", () => {
    expect(truncateAddress("ark1short")).toBe("ark1short");
  });
});
