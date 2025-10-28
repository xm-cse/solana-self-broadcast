import { 
  SystemProgram, 
  TransactionMessage, 
  VersionedTransaction,
  PublicKey,
  Connection,
  LAMPORTS_PER_SOL,
  Keypair 
} from "@solana/web3.js";
import { 
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  TOKEN_2022_PROGRAM_ID 
} from "@solana/spl-token";
import bs58 from "bs58";
import { createSmartWallet, walletSigner, CrossmintWalletResponse } from "./walletUtils";
import nacl from "tweetnacl";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
export const randomExternalWallet = Keypair.generate();

export async function createTokenWith2022Program(): Promise<{
    transaction: VersionedTransaction, 
    walletAddress: string,
    recipientTokenAccount: string
}> {
    try{
        console.log('Creating token using Solana Token Program 2022');

        // Create a Crossmint wallet
        console.log(process.env.CROSSMINT_API_KEY);
        const crossmintWalletResponse = await createSmartWallet();
        const smartWallet = new PublicKey(crossmintWalletResponse.address);

        //make sure you send some SOL to the wallet before using it as it will be the one paying the instructions onchain
        
        console.log('Using Crossmint wallet:', smartWallet.toString());
        
        // Get the minimum lamports for rent exemption
        const lamports = await getMinimumBalanceForRentExemptMint(connection);
        
        // Get latest blockhash
        const { blockhash } = await connection.getLatestBlockhash();

        // Step 2: Create the mint account on blockchain
        const createAccountInstruction = SystemProgram.createAccount({
            fromPubkey: smartWallet,
            newAccountPubkey: randomExternalWallet.publicKey,
            space: MINT_SIZE,
            lamports,
            programId: TOKEN_2022_PROGRAM_ID,
        });

        // Step 3: Initialize it as a mint
        const initMintInstruction = createInitializeMintInstruction(
            randomExternalWallet.publicKey,
            9,
            smartWallet,  // Using payer as mint authority
            smartWallet,  // Using payer as freeze authority
            TOKEN_2022_PROGRAM_ID
        );
        
         // 1- Create recipient token account
         const recipientKeypair = Keypair.generate();
         const recipientAddress = new PublicKey(recipientKeypair.publicKey.toString());
        
        // 2- Get the associated token address, Calculates the address where the token account should be off-chain
         const recipientTokenAccount = await getAssociatedTokenAddress(
             randomExternalWallet.publicKey,
             recipientAddress,
             true, // allowOwnerOffCurve
             TOKEN_2022_PROGRAM_ID
         );
 
         console.log('Recipient Token Account:', recipientTokenAccount.toString());
        
         // 3- Create instruction to initialize the recipient's token account onchain
        const createTokenAccountInstruction = createAssociatedTokenAccountInstruction(
            smartWallet,  // payer
            recipientTokenAccount, // ata
            recipientAddress, // owner
            randomExternalWallet.publicKey, // mint
            TOKEN_2022_PROGRAM_ID // program ID
        );
        
        // Use TransactionMessage and VersionedTransaction as shown in the example
        const message = new TransactionMessage({
            instructions: [
                createAccountInstruction,
                initMintInstruction,
                createTokenAccountInstruction // Added instruction to create token account
            ],
            recentBlockhash: blockhash,
            payerKey: smartWallet,
        }).compileToV0Message();
        
        // Create a VersionedTransaction
        const transaction = new VersionedTransaction(message);

        console.log('\nTransaction created successfully');
        console.log('Key Information:');
        console.log('Payer/Authority Address:', smartWallet.toString());
        console.log('Mint Address:', randomExternalWallet.publicKey.toString());
        console.log('Recipient Token Account:', recipientTokenAccount.toString());

        return {
            transaction: transaction,
            walletAddress: smartWallet.toString(),
            recipientTokenAccount: recipientTokenAccount.toString()
        };
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
} 

// Function to generate transaction approvals
export function generateTransactionApprovals(
    pendingApprovals: Array<{ message: string; signer: string }>,
    availableSigners: Keypair[]
): Array<{ signer: string; signature: string }> {
    return pendingApprovals.map((approval) => {
        const signer = availableSigners.find((keypair) => 
            approval.signer.includes(keypair.publicKey.toString())
        );
        
        if (!signer) {
            throw new Error(`No matching keypair found for required signer: ${approval.signer}`);
        }
        
        const signature = bs58.encode(
            nacl.sign.detached(
                bs58.decode(approval.message),
                signer.secretKey
            )
        );
        
        return {
            signer: approval.signer,
            signature: signature
        };
    });
}

export async function validateAndBroadcast(
    wrappedTxBase58: string,
    approvals: Array<{ signer: string; signature: string }>,
    lastValidBlockHeight: number
): Promise<string> {
    const transaction = VersionedTransaction.deserialize(bs58.decode(wrappedTxBase58));
    
    console.log('📦 Analyzing wrapped transaction from Crossmint...');
    
    // Check which signers are ACTUALLY required on-chain
    const numRequiredSignatures = transaction.message.header.numRequiredSignatures;
    const accountKeys = transaction.message.getAccountKeys();
    const requiredSignerKeys = accountKeys.staticAccountKeys
        .slice(0, numRequiredSignatures)
        .map(pk => pk.toBase58());
    
    console.log('Required on-chain signers:', requiredSignerKeys);
    console.log('Number of signatures needed:', numRequiredSignatures);
    
    // Build signature map from approvals
    const signaturesByPubkey: Record<string, string> = {};
    for (const approval of approvals) {
        const pubkey = approval.signer.split(':')[1];
        signaturesByPubkey[pubkey] = approval.signature;
        console.log(`Have signature for: ${pubkey}`);
    }
    
    // Use the existing transaction signatures (already includes Crossmint's signature)
    // Just replace with our signatures where we have them
    console.log('\n📝 Updating signatures...');
    for (const approval of approvals) {
        const pubkey = approval.signer.split(':')[1];
        const signatureBytes = bs58.decode(approval.signature);
        
        if (signatureBytes.length !== 64) {
            throw new Error(`Invalid signature length for ${pubkey}: ${signatureBytes.length} bytes`);
        }
        
        // Find the index of this pubkey in requiredSignerKeys
        const index = requiredSignerKeys.indexOf(pubkey);
        if (index !== -1) {
            transaction.signatures[index] = signatureBytes;
            console.log(`  Updated signature ${index + 1} for ${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`);
        }
    }
    console.log('✅ All signatures attached');
    
    // Broadcast
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Note: We skip simulation because the Crossmint wrapped transaction 
    // expects the wallet to be funded, which Crossmint handles separately
    
    // Broadcast
    console.log('\n📡 Broadcasting transaction...');
    const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        {
            skipPreflight: false,
            maxRetries: 5,
            preflightCommitment: 'processed',
        }
    );
    
    console.log('✅ Transaction sent!');
    console.log('   Signature:', signature);
    console.log('   Explorer: https://explorer.solana.com/tx/' + signature + '?cluster=devnet');
    
    // Wait for confirmation
    console.log('\n⏳ Waiting for confirmation...');
    await connection.confirmTransaction({
        signature,
        blockhash: transaction.message.recentBlockhash,
        lastValidBlockHeight,
    }, 'confirmed');
    
    console.log('✅ Transaction confirmed!');
    
    return signature;
}

export async function sendTransactionToCrossmint(walletAddress: string, serializedTransaction: string): Promise<any> {
    const CROSSMINT_API_KEY = process.env.CROSSMINT_API_KEY;
    if (!CROSSMINT_API_KEY) {
        throw new Error('CROSSMINT_API_KEY not set in environment variables');
    }

    try {
        console.log(`Sending transaction to Crossmint for wallet: ${walletAddress}`);
        const response = await fetch(`https://staging.crossmint.com/api/2022-06-09/wallets/${walletAddress}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': CROSSMINT_API_KEY
            },
            body: JSON.stringify({
                params: {
                    transaction: serializedTransaction,
                    requiredSigners: [randomExternalWallet.publicKey.toString()] 
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to send transaction to Crossmint: ${response.statusText}. Details: ${errorText}`);
        }

        const data = await response.json();
        console.log('Transaction sent to Crossmint successfully');
        return data;
    } catch (error) {
        console.error('Error sending transaction to Crossmint:', error);
        throw error;
    }
}

