const BARK_WASM_BUILD_HINT =
  "Bark WASM is not built. Run: npm run vendor:bark-wasm && npm run build:bark-wasm (needs Rust + wasm-pack).";

function notBuilt(): never {
  throw new Error(BARK_WASM_BUILD_HINT);
}

export default async function init(): Promise<void> {
  notBuilt();
}

export function generateMnemonic(): string {
  notBuilt();
}

export function validateMnemonic(_m: string): boolean {
  notBuilt();
}

export function validateArkAddress(_a: string): boolean {
  notBuilt();
}

export const Config = {
  create: () => notBuilt(),
};

export const Network = { Signet: "signet" };

export const Wallet = {
  create: async () => notBuilt(),
  open: async () => notBuilt(),
};
