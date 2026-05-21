export const HARDWARE_AUTH_HEADER = "x-wallet-hardware-auth";
export const SETUP_TOKEN_HEADER = "x-wallet-setup-token";
export const PENDING_OP_HEADER = "x-wallet-pending-op";

export const HARDWARE_REQUIRED_PATHS = new Set([
  "/api/wallet/send",
  "/api/wallet/refresh",
  "/api/wallet/address",
]);
