import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const WALLET_ROUTES = join(process.cwd(), "src/app/api/wallet");

type GuardRule = {
  file: string;
  include: RegExp | RegExp[];
  exclude?: RegExp[];
};

const RULES: GuardRule[] = [
  { file: "balance/route.ts", include: /withReadCryptoGuard/ },
  { file: "history/route.ts", include: /withReadCryptoGuard/ },
  { file: "sync/route.ts", include: /withReadCryptoGuard/ },
  { file: "send/route.ts", include: /withSensitiveCryptoGuard/ },
  {
    file: "send/estimate/route.ts",
    include: /withCryptoGuard/,
    exclude: [/withSensitiveCryptoGuard/],
  },
  { file: "refresh/route.ts", include: /withSensitiveCryptoGuard/ },
  {
    file: "address/route.ts",
    include: [/withReadCryptoGuard/, /withSensitiveCryptoGuard/],
  },
  { file: "ready/route.ts", include: /assertApiSecurity/ },
];

describe("wallet API route guards", () => {
  for (const rule of RULES) {
    it(`${rule.file} uses expected guard wrapper`, () => {
      const src = readFileSync(join(WALLET_ROUTES, rule.file), "utf8");
      const includes = Array.isArray(rule.include) ? rule.include : [rule.include];
      for (const re of includes) {
        expect(src).toMatch(re);
      }
      for (const re of rule.exclude ?? []) {
        expect(src).not.toMatch(re);
      }
    });
  }
});
