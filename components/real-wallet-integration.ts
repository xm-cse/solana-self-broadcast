import { config as dotenvConfig } from "dotenv";

// Load environment variables from .env file first
dotenvConfig();

import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { randomExternalWallet } from "../utils/tokenCreation";
import bs58 from "bs58";
import { walletSigner } from "../utils/walletUtils";
import { createTokenWith2022Program, sendTransactionToCrossmint, generateTransactionApprovals, validateAndBroadcast } from "../utils/tokenCreation";



async function main() {
   

    try {

        console.log("\x1b[36m%s\x1b[0m", "=== Solana Token Creation ===\n");

        // Step 1: Create the token
        console.log("\x1b[32m%s\x1b[0m", "Step 1: Creating token transaction...");
        const { transaction, walletAddress, recipientTokenAccount } = await createTokenWith2022Program();
    
        // Step 2: Display transaction information
        console.log("\n\x1b[32m%s\x1b[0m", "Step 2: Transaction ready");
        console.log("\x1b[36m%s\x1b[0m", "Transaction created successfully!");
        console.log("Payer Wallet:", walletAddress);
        console.log("Token Mint Address:", randomExternalWallet.publicKey.toString());
        console.log("Recipient Token Account:", recipientTokenAccount);
    
        // Step 3: Send transaction to Crossmint API
        console.log(
          "\n\x1b[32m%s\x1b[0m",
          "Step 3: Sending transaction to Crossmint API..."
        );
        const serializedTransaction = bs58.encode(transaction.serialize());
        const crossmintResponse = await sendTransactionToCrossmint(
          walletAddress,
          serializedTransaction
        );
        console.log(
          "\nCrossmint API Response:",
          JSON.stringify(crossmintResponse, null, 2)
        );
    
        // Step 4: Approve the transaction if we have pending approvals
        if (
          crossmintResponse &&
          crossmintResponse.approvals &&
          crossmintResponse.approvals.pending &&
          crossmintResponse.approvals.pending.length > 0
        ) {
          console.log("\n\x1b[32m%s\x1b[0m", "Step 4: Approving transaction...");
          
          // Use our new function to generate the approvals
          const approvals = generateTransactionApprovals(
            crossmintResponse.approvals.pending,
            [randomExternalWallet, walletSigner] // Available signers
          );
          
          console.log("Generated approvals:", approvals);
          
          const wrappedTxBase58 = crossmintResponse.onChain.transaction;
          const lastValidBlockHeight = crossmintResponse.onChain.lastValidBlockHeight;
          
          // Validate signatures and broadcast
          await validateAndBroadcast(wrappedTxBase58, approvals, lastValidBlockHeight);
        }

    } catch (err) {
      console.error("❌ Error:", err);
      process.exit(1);
    }
}

// Run the script
main().then(() => {
    console.log("\n\x1b[32m%s\x1b[0m", "Script completed successfully!");
    process.exit(0);
}).catch((err) => {
    console.error("❌ Script failed:", err);
    process.exit(1);
});
  
