# Para Wallet Integration

## Overview

This integration automatically creates and manages Para wallets for users, enabling server-side blockchain operations within workflow steps.

## What This Does

1. **Automatic Wallet Creation**: When a user signs up, a Para wallet is automatically created for them
2. **Secure Storage**: Wallet keyshares are encrypted with AES-256-GCM and stored securely in the database
3. **Server-Side Access**: Workflow steps can use the user's wallet to perform blockchain operations (sending transactions, signing messages, interacting with smart contracts, etc.)
4. **User Visibility**: Users can see their wallet address displayed in the user dropdown menu

## How It Works

### Wallet Creation Flow
1. **User signs up** → Better Auth triggers a database hook
   - File: `lib/auth.ts`
   - Hook: `databaseHooks.user.create.after`

2. **Database hook calls Para SDK** to create a pregenerated wallet
   - `const wallet = await paraClient.createPregenWallet({ type: "EVM", pregenId: { email } })`
   - Returns: `{ id, address, ... }`

3. **Wallet keyshare is encrypted** and stored in database
   - File: `lib/encryption.ts`
   - Function: `encryptUserShare(userShare)`
   - Stored in: `para_wallets` table

4. **Wallet address is displayed** to the user
   - File: `components/workflows/user-menu.tsx`
   - Shown in user dropdown menu

### Workflow Step Usage
When a workflow step needs to use the wallet:
1. Fetch encrypted keyshare from database (using authenticated userId)
2. Decrypt the keyshare
3. Initialize Para signer for blockchain operations
4. Perform the operation (send transaction, sign message, call smart contract, etc.)

## Key Components

### Database
- **Table**: `para_wallets`
- **Fields**: userId (unique), email, walletId, walletAddress, encrypted userShare, createdAt
- **Security**: One wallet per user, foreign key to users table, cascading delete

### Encryption
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Storage**: Environment variable `WALLET_ENCRYPTION_KEY`
- **Format**: `iv:authTag:encryptedData` (prevents tampering)

### Helper Functions
- `getUserWallet(userId)` - Retrieve wallet from database
- `initializeParaSigner(userId, rpcUrl)` - Get ready-to-use signer for transactions
- `getUserWalletAddress(userId)` - Get wallet address for display
- `userHasWallet(userId)` - Check if user has wallet

## What You Can Build

Workflow steps that use the user's wallet can:
- Send ETH or ERC-20 tokens
- Interact with smart contracts (DeFi, NFTs, DAOs)
- Sign messages or data
- Check balances and token ownership
- Execute any blockchain operation the user authorizes

## Key Files

- `lib/auth.ts` - Better Auth configuration with wallet creation hook
- `lib/db/schema.ts` - Database schema for `para_wallets` table
- `lib/encryption.ts` - AES-256-GCM encryption/decryption utilities
- `lib/para/wallet-helpers.ts` - Helper functions for wallet operations
- `app/api/user/route.ts` - API endpoint that includes wallet address
- `components/workflows/user-menu.tsx` - UI component displaying wallet address

## Environment Variables Required

```env
PARA_API_KEY=your-para-api-key
PARA_ENVIRONMENT=beta  # or 'prod'
WALLET_ENCRYPTION_KEY=64-character-hex-string
```

## Security Notes

- All Para SDK operations happen server-side only
- userShare never transmitted to browser
- Encryption key stored only in environment variables
- Each user can only access their own wallet (enforced by userId authentication)
