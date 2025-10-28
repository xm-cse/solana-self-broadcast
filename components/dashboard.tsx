import { useState } from "react";
import { useWallet } from "@crossmint/client-sdk-react-ui";
import Image from "next/image";
import { RealWalletIntegration } from "./real-wallet-integration";
import { LogoutButton } from "./logout";

export function Dashboard() {
  const { wallet } = useWallet();
  const [copiedAddress, setCopiedAddress] = useState(false);

  const walletAddress = wallet?.address;

  const handleCopyAddress = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 content-center">
      <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:pt-8">
        <div className="flex flex-col mb-6 max-sm:items-center">
          <Image
            src="/crossmint.svg"
            alt="Crossmint logo"
            priority
            width={150}
            height={150}
            className="mb-4"
          />
          <h1 className="text-2xl font-semibold mb-2">Wallets Quickstart</h1>
          <p className="text-gray-600 text-sm">
            Create and interact with Crossmint wallets
          </p>
        </div>

        {/* Dashboard Header */}
        <div className="flex flex-col gap-4 bg-white rounded-2xl border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Dashboard</h2>
            <LogoutButton />
          </div>

          {/* Real Wallet Integration */}
          <RealWalletIntegration />
        </div>
      </div>
    </div>
  );
}
