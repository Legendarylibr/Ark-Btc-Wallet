"use client";

export function getSdkWebAuthnConfig(): {
  rpName: string;
  rpID: string;
} {
  const hostname = window.location.hostname || "localhost";
  return {
    rpName: "Ark Wallet",
    rpID: hostname,
  };
}
