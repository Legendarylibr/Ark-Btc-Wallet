/** Minimal shapes aligned with Bark SDK (see @secondts/bark-react-native types) */

export interface SdkBalance {
  spendableSats: number;
  pendingLightningSendSats: number;
  claimableLightningReceiveSats: number;
}

export interface SdkSendEstimate {
  amount_sat: number;
  fee_sat: number;
  total_sat: number;
  spendable_sat: number;
  affordable: boolean;
  note?: string;
}

export interface SdkWalletHandle {
  sync(): Promise<void>;
  balance(): Promise<SdkBalance>;
  newAddress(): Promise<string>;
  estimateArkSend(destination: string, amountSat: number): Promise<SdkSendEstimate>;
  sendArk(destination: string, amountSat: number): Promise<void>;
  refreshReceived(): Promise<void>;
  close(): void;
}
