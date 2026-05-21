import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      process.env.NEXT_PUBLIC_WALLET_BACKEND === "sdk"
        ? "script-src 'self' 'wasm-unsafe-eval'"
        : "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

if (process.env.ENABLE_HSTS === "true") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  });
  const csp = securityHeaders.find((h) => h.key === "Content-Security-Policy");
  if (csp) {
    csp.value += "; upgrade-insecure-requests";
  }
}

const signetConnect =
  "https://ark.signet.2nd.dev https://esplora.signet.2nd.dev";

const cspEntry = securityHeaders.find((h) => h.key === "Content-Security-Policy");
if (cspEntry && process.env.NEXT_PUBLIC_WALLET_BACKEND === "sdk") {
  cspEntry.value = cspEntry.value.replace(
    "connect-src 'self'",
    `connect-src 'self' ${signetConnect}`,
  );
}

const barkWasmBundler = path.join(
  process.cwd(),
  "packages/bark-wasm/pkg/bundler/bark.js",
);
const hasBarkWasmBuild = fs.existsSync(barkWasmBundler);
const barkWasmStub = path.join(process.cwd(), "src/sdk/bark/wasm-stub.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: hasBarkWasmBuild ? ["@secondts/bark-wasm"] : [],
  webpack: (config, { isServer }) => {
    if (!hasBarkWasmBuild) {
      config.resolve ??= {};
      config.resolve.alias = {
        ...config.resolve.alias,
        "@secondts/bark-wasm": barkWasmStub,
      };
    } else if (!isServer) {
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
      };
    }
    return config;
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],
};

export default nextConfig;
