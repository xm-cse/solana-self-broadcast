# Solana Multi-Signature Transaction with Crossmint

This project demonstrates a server-side multi-signature Solana transaction flow using Crossmint Smart Wallets.

## Overview

This implementation showcases how to:
- Create a Solana v0 (VersionedTransaction) using `@solana/web3.js`
- Sign transactions with multiple signers (Crossmint Smart Wallet + external wallet)
- Partially sign with an external wallet
- Send the partially-signed transaction to Crossmint for additional signature
- Self-broadcast the fully-signed transaction to the Solana network

## Features

- **Server-Side Execution**: All transaction logic runs server-side without UI dependencies
- **Multi-Signature Support**: Transactions require signatures from both Crossmint Smart Wallet and external wallet
- **Token Program 2022**: Creates tokens using Solana's advanced Token Program 2022
- **Self-Broadcasting**: You control when and how transactions are broadcast to the network
- **Signature Validation**: Validates all required signatures before broadcasting

## Project Structure

```
wallets-quickstart/
├── components/
│   └── real-wallet-integration.ts    # Main server-side execution script
├── utils/
│   ├── tokenCreation.ts               # Token creation and transaction utilities
│   └── walletUtils.ts                 # Crossmint wallet management
└── .env                               # Environment configuration
```

## How It Works

### 1. Token Creation
The `createTokenWith2022Program()` function creates a Solana Token Program 2022 token with:
- A Crossmint Smart Wallet as the payer and authority
- A randomly generated external wallet as the mint address
- An associated token account for a recipient

### 2. Multi-Signature Flow
1. Create and serialize the VersionedTransaction
2. Send to Crossmint API to get pending approval messages
3. Sign approval messages with available signers
4. Validate all required signatures are present
5. Broadcast the fully-signed transaction

### 3. Signature Validation
The `validateAndBroadcast()` function:
- Analyzes the transaction to determine required signers
- Checks that all signatures are present
- Attaches signatures in the correct order
- Simulates the transaction before broadcasting
- Confirms transaction on-chain

## Setup

### Prerequisites
- Node.js 18+ 
- Crossmint API Key with necessary scopes

### Installation

1. Clone the repository:
```bash
git clone https://github.com/xm-cse/solana-self-broadcast.git
cd solana-self-broadcast
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.template .env
```

Add your Crossmint API key to `.env`:
```bash
CROSSMINT_API_KEY=your_api_key_here
```

Get your API key from [Crossmint Console](https://console.crossmint.com/)

### Running the Server-Side Script

**Important:** Before running the script, you need to fund the Crossmint Smart Wallet with SOL. The wallet created by the script will be used as the payer for the transaction, so it needs sufficient SOL balance.

Execute the server-side transaction flow:
```bash
npx tsx components/real-wallet-integration.ts
```

This will:
1. Create a Crossmint Smart Wallet
2. You must fund the wallet with SOL before proceeding (the script will show the wallet address)
3. Create a Token Program 2022 token
4. Send the transaction to Crossmint for approval
5. Sign with available signers
6. Validate and broadcast the transaction
7. Show the transaction ID and explorer link


## API Reference

### Main Functions

#### `createTokenWith2022Program()`
Creates a Solana Token Program 2022 transaction with multi-signature support.
- **Returns**: `{ transaction, walletAddress, recipientTokenAccount }`
- **Usage**: `const { transaction, walletAddress, recipientTokenAccount } = await createTokenWith2022Program();`

#### `sendTransactionToCrossmint(walletAddress, serializedTransaction)`
Sends a transaction to Crossmint API for signature.
- **Parameters**: 
  - `walletAddress`: Crossmint wallet address
  - `serializedTransaction`: Base58 encoded transaction
- **Returns**: Crossmint API response with approval messages

#### `generateTransactionApprovals(pendingApprovals, availableSigners)`
Generates signatures for approval messages.
- **Parameters**:
  - `pendingApprovals`: Array of approval messages from Crossmint
  - `availableSigners`: Array of Keypair objects
- **Returns**: Array of signed approvals

#### `validateAndBroadcast(wrappedTxBase58, approvals, lastValidBlockHeight)`
Validates signatures and broadcasts transaction.
- **Parameters**:
  - `wrappedTxBase58`: Transaction from Crossmint
  - `approvals`: Signed approval messages
  - `lastValidBlockHeight`: Last valid block height
- **Returns**: Transaction signature

## Key Concepts

### Multi-Signature Transactions
Solana requires all signers to authorize a transaction. In this implementation:
1. Crossmint Smart Wallet is the payer (signer #1)
2. External wallet (randomly generated) is the mint authority (signer #2)

### Crossmint Approval Flow
1. Send unsigned transaction to Crossmint
2. Receive approval messages for required signers
3. Sign approval messages with available keypairs
4. Crossmint adds its signature
5. You broadcast the fully-signed transaction

### Transaction Lifecycle
```
Create Transaction → Serialize → Send to Crossmint → Get Approvals → Sign Approvals → Validate → Broadcast → Confirm
```

## Error Handling

The script handles common errors:
- Missing API key
- Network failures
- Signature validation failures
- Transaction simulation failures
- Missing signatures

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `CROSSMINT_API_KEY` | Crossmint API key | Yes |
