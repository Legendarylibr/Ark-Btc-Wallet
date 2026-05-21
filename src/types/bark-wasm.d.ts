declare module "@secondts/bark-wasm" {
  export default function init(): Promise<void>;
  export function generateMnemonic(): string;
  export function validateMnemonic(mnemonic: string): boolean;
  export function validateArkAddress(address: string): boolean;
  export const Config: {
    create(opts: Record<string, unknown>): unknown;
  };
  export const Network: { Signet: unknown };
  export const Wallet: {
    create(
      mnemonic: string,
      config: unknown,
      datadir: string,
      forceRescan: boolean,
    ): Promise<unknown>;
    open(mnemonic: string, config: unknown, datadir: string): Promise<unknown>;
  };
}
