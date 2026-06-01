import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "ambient-light-sensor=()",
      "autoplay=()",
      "battery=()",
      "browsing-topics=()",
      "camera=()",
      "clipboard-read=()",
      "display-capture=()",
      "encrypted-media=()",
      "fullscreen=()",
      "gamepad=()",
      "geolocation=()",
      "gyroscope=()",
      "hid=()",
      "idle-detection=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=()",
      "picture-in-picture=()",
      "publickey-credentials-create=(self)",
      "publickey-credentials-get=(self)",
      "serial=()",
      "speaker-selection=()",
      "usb=()",
      "xr-spatial-tracking=()",
    ].join(", "),
  },
];

if (process.env.ENABLE_HSTS === "true") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  });
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@secondts/bark"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
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
