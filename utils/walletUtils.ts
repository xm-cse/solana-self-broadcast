import { PublicKey, Keypair } from "@solana/web3.js";
import bs58 from "bs58";

// Crossmint API configuration
const CROSSMINT_API_KEY = process.env.CROSSMINT_API_KEY || "YOUR_API_KEY";
export const walletSigner = loadWalletFromEnv();

// Interface representing the Crossmint wallet response
export interface CrossmintWalletResponse {
  type: string;
  config: {
    adminSigner: {
      type: string;
      address: string;
      locator: string;
    };
  };
  address: string;
  createdAt: string;
  id?: string; // May be included in some responses
  chain?: string; // May be included in some responses
  status?: string; // May be included in some responses
}

/**
 * Loads a wallet from the WALLET_SECRET_KEY environment variable
 * @returns A Solana Keypair
 * @throws Error if the wallet cannot be loaded
 */
export function loadWalletFromEnv(): Keypair {
  return Keypair.generate();
}


// Interface representing the Crossmint wallet response
export interface CrossmintWalletResponse {
  type: string;
  config: {
    adminSigner: {
      type: string;
      address: string;
      locator: string;
    };
  };
  address: string;
  createdAt: string;
  id?: string; // May be included in some responses
  chain?: string; // May be included in some responses
  status?: string; // May be included in some responses
}

/**
 * Creates a Crossmint smart wallet for Solana
 * @returns The wallet response with address and details
 */
export async function createSmartWallet(): Promise<CrossmintWalletResponse> {
  try {

    const signer= walletSigner.publicKey.toString();
    const response = await fetch(
      "https://staging.crossmint.com/api/2025-06-09/wallets",
      {
        method: "POST",
        headers: {
          "X-API-KEY": "sk_staging_AFZUDFHq2bddWxPaX1sD6suemuUzwoFJdQmR3AAV7nnGgurY2FqwEmyEhj5azFztjfQYn21GsvmNNgKaVdxrvEum52LheAnbG8k1s12Avjv7AzcsYTo8iWVKYnJo7EnMpu9E261shoNuNyGT7vC69WqwRXpG9dEh2TXxBaNCfWtWJuSDCiBVGFJfDcfgawAWKePHneT5dvWMjNHnsmngnRni",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chainType: "solana",
          type: "smart",
          config: {
            adminSigner: {
              type: "external-wallet",
              address: signer
            }
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Crossmint API error response:', errorText);
      throw new Error(`Failed to create wallet: ${response.statusText}. Details: ${errorText}`);
    }

    const wallet = await response.json();
    console.log("Successfully created Crossmint wallet:", wallet);
    return wallet;
  } catch (error) {
    console.error("Error creating Crossmint wallet:", error);
    throw error;
  }
}

/**
 * Retrieves an existing Crossmint wallet by ID
 * @param walletId The ID of the wallet to retrieve
 * @returns The wallet response with address and details
 */
export async function getCrossmintWallet(
  walletId: string
): Promise<CrossmintWalletResponse> {
  try {
    const response = await fetch(
      `https://staging.crossmint.com/api/2022-06-09/wallets/${walletId}`,
      {
        method: "GET",
        headers: {
          "X-API-KEY": CROSSMINT_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to retrieve wallet: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error retrieving Crossmint wallet:", error);
    throw error;
  }
}

