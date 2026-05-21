import { WalletApp } from "@/components/WalletApp";
import { SdkWalletApp } from "@/components/SdkWalletApp";
import { isSdkMode } from "@/sdk/mode";

export default function Home() {
  if (isSdkMode()) {
    return <SdkWalletApp />;
  }
  return <WalletApp />;
}
