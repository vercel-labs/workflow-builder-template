# Para Wallet Integration Guide

This guide walks through adding automatic Para wallet creation on user signup, allowing users to interact with blockchain directly from workflows.

## Overview

When a user signs up, a Para pregenerated wallet is automatically created and securely stored. Users can then use custom workflow actions to sign transactions, check balances, and interact with smart contracts using their wallet.

## Architecture

```
User Signs Up → Better Auth Hook → Para SDK → Create Wallet → Store Encrypted
                                                                      ↓
Workflow Executes → Retrieve Wallet → Decrypt userShare → Sign Transaction
```

### Security Model

- **Database**: userShare stored encrypted with AES-256-GCM
- **Server-Only**: All Para SDK operations happen server-side
- **No Client Access**: userShare never transmitted to browser
- **Per-User**: Each user gets one wallet linked to their account

---

## Implementation Steps

### Phase 1: Setup & Dependencies

#### Step 1: Install Para SDK Dependencies

```bash
pnpm add @getpara/server-sdk @getpara/ethers-v6-integration ethers
```

**What this installs:**
- `@getpara/server-sdk` - Para Server SDK for wallet creation/management
- `@getpara/ethers-v6-integration` - Para signer integration with Ethers.js
- `ethers` - Ethereum JavaScript library for blockchain interactions

---

#### Step 2: Add Environment Variables

**Generate encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Add to `.env.local`:**
```env
# Para Wallet Configuration
PARA_API_KEY=your-para-api-key-here
PARA_ENVIRONMENT=beta  # Use 'beta' for testing, 'prod' for production

# Encryption Key for userShare (32 bytes hex = 64 characters)
WALLET_ENCRYPTION_KEY=paste-generated-key-here
```

**Where to get Para API key:**
1. Visit https://para.network/dashboard
2. Create account / sign in
3. Generate API key from dashboard
4. Copy and paste into `.env.local`

---

### Phase 2: Database & Encryption

#### Step 3: Create Database Schema

**File:** `lib/db/schema.ts`

Add this table definition:

```typescript
export const paraWallets = pgTable("para_wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull()
    .unique(), // One wallet per user
  email: text("email").notNull(),
  walletId: text("wallet_id").notNull(), // Para wallet ID
  walletAddress: text("wallet_address").notNull(), // EVM address (0x...)
  userShare: text("user_share").notNull(), // Encrypted keyshare
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ParaWallet = typeof paraWallets.$inferSelect;
export type NewParaWallet = typeof paraWallets.$inferInsert;
```

**Note:** Add this near other table definitions in the file.

---

#### Step 4: Create Encryption Utilities

**File:** `lib/crypto.ts` (new file)

```typescript
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY!;
const ALGORITHM = "aes-256-gcm";

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error(
    "WALLET_ENCRYPTION_KEY must be a 32-byte hex string (64 characters)"
  );
}

/**
 * Encrypt sensitive userShare before storing in database
 * Uses AES-256-GCM for authenticated encryption
 */
export function encryptUserShare(userShare: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv
  );

  let encrypted = cipher.update(userShare, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return (
    iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted
  );
}

/**
 * Decrypt userShare when needed for signing transactions
 */
export function decryptUserShare(encryptedData: string): string {
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv
  );
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
```

**Security Notes:**
- IV (Initialization Vector) is randomly generated for each encryption
- Auth tag provides authentication to prevent tampering
- Encryption key stored in environment variable (never committed to git)

---

### Phase 3: Para Integration

#### Step 5: Add Better Auth Hook for Auto Wallet Creation

**File:** `lib/auth.ts`

Add the following imports at the top:

```typescript
import { ParaServer, Environment } from "@getpara/server-sdk";
import { paraWallets } from "./db/schema";
import { encryptUserShare } from "./crypto";
```

Then modify the `betterAuth` configuration to add the wallet creation hook:

```typescript
export const auth = betterAuth({
  baseURL: getBaseURL(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      enabled: !!process.env.GITHUB_CLIENT_ID,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!process.env.GOOGLE_CLIENT_ID,
    },
  },
  plugins,

  // ADD THIS HOOKS CONFIGURATION
  hooks: {
    after: [
      {
        // Hook that runs AFTER user account is created
        matcher: (context) => context.type === "user.created",

        handler: async (context) => {
          const user = context.user;

          // Skip wallet creation if no email
          if (!user.email) {
            console.log("[Para] Skipping wallet creation - no email");
            return;
          }

          console.log(`[Para] Creating wallet for user: ${user.email}`);

          try {
            const PARA_API_KEY = process.env.PARA_API_KEY;
            const PARA_ENV = process.env.PARA_ENVIRONMENT || "beta";

            if (!PARA_API_KEY) {
              console.warn("[Para] PARA_API_KEY not configured");
              return;
            }

            // Initialize Para SDK
            const paraClient = new ParaServer(
              PARA_ENV === "prod" ? Environment.PROD : Environment.BETA,
              PARA_API_KEY
            );

            // Check if wallet already exists
            const hasWallet = await paraClient.hasPregenWallet({
              pregenId: { email: user.email },
            });

            if (hasWallet) {
              console.log(`[Para] Wallet already exists for ${user.email}`);
              return;
            }

            // Create pregenerated wallet
            const wallet = await paraClient.createPregenWallet({
              type: "EVM",
              pregenId: { email: user.email },
            });

            // Get user's cryptographic share
            const userShare = await paraClient.getUserShare();

            // Store encrypted wallet in database
            await db.insert(paraWallets).values({
              userId: user.id,
              email: user.email,
              walletId: wallet.walletId,
              walletAddress: wallet.address,
              userShare: encryptUserShare(userShare), // Encrypted!
            });

            console.log(
              `[Para] ✓ Wallet created successfully: ${wallet.address}`
            );
          } catch (error) {
            console.error(`[Para] Failed to create wallet:`, error);
            // Don't throw - let signup succeed even if wallet creation fails
          }
        },
      },
    ],
  },
});
```

**What this does:**
- Runs automatically after any user signup (email, OAuth, anonymous conversion)
- Creates Para wallet using user's email as identifier
- Encrypts userShare before storing in database
- Logs success/failure without blocking signup

---

#### Step 6: Create Helper Functions to Retrieve User Wallets

**Create directory:** `lib/para/`

**File:** `lib/para/wallet-helpers.ts` (new file)

```typescript
import "server-only";
import { db } from "@/lib/db";
import { paraWallets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ParaServer, Environment } from "@getpara/server-sdk";
import { ParaEthersSigner } from "@getpara/ethers-v6-integration";
import { ethers } from "ethers";
import { decryptUserShare } from "@/lib/crypto";

/**
 * Get user's Para wallet from database
 * @throws Error if wallet not found
 */
export async function getUserWallet(userId: string) {
  const wallet = await db
    .select()
    .from(paraWallets)
    .where(eq(paraWallets.userId, userId))
    .limit(1);

  if (wallet.length === 0) {
    throw new Error("No Para wallet found for user");
  }

  return wallet[0];
}

/**
 * Initialize Para signer for user
 * This signer can sign transactions using the user's Para wallet
 *
 * @param userId - User ID from session
 * @param rpcUrl - Blockchain RPC URL (e.g., Ethereum mainnet, Polygon, etc.)
 * @returns Para Ethers signer ready to sign transactions
 */
export async function initializeParaSigner(
  userId: string,
  rpcUrl: string
): Promise<ParaEthersSigner> {
  const PARA_API_KEY = process.env.PARA_API_KEY;
  const PARA_ENV = process.env.PARA_ENVIRONMENT || "beta";

  if (!PARA_API_KEY) {
    throw new Error("PARA_API_KEY not configured");
  }

  // Get user's wallet from database
  const wallet = await getUserWallet(userId);

  // Initialize Para client
  const paraClient = new ParaServer(
    PARA_ENV === "prod" ? Environment.PROD : Environment.BETA,
    PARA_API_KEY
  );

  // Decrypt and set user's keyshare
  const decryptedShare = decryptUserShare(wallet.userShare);
  await paraClient.setUserShare(decryptedShare);

  // Create blockchain provider and signer
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ParaEthersSigner(paraClient, provider);

  return signer;
}

/**
 * Get user's wallet address
 * Useful for displaying wallet address in UI
 */
export async function getUserWalletAddress(userId: string): Promise<string> {
  const wallet = await getUserWallet(userId);
  return wallet.walletAddress;
}

/**
 * Check if user has a Para wallet
 */
export async function userHasWallet(userId: string): Promise<boolean> {
  const wallet = await db
    .select()
    .from(paraWallets)
    .where(eq(paraWallets.userId, userId))
    .limit(1);

  return wallet.length > 0;
}
```

**Usage in workflow actions:**
```typescript
// In a workflow step function
const signer = await initializeParaSigner(userId, rpcUrl);
const tx = await signer.sendTransaction({ to, value });
```

---

### Phase 4: Database & Testing

#### Step 7: Run Database Migration

```bash
# Generate migration file
pnpm db:generate

# Apply migration to database
pnpm db:push
```

**What this does:**
- Creates `para_wallets` table in PostgreSQL
- Sets up foreign key relationship with `users` table
- Adds unique constraint (one wallet per user)

**Verify migration:**
```sql
-- Connect to your database and check
\d para_wallets

-- Should show columns: id, user_id, email, wallet_id, wallet_address, user_share, created_at
```

---

#### Step 8: Test Wallet Creation on New User Signup

**Restart development server:**
```bash
# Stop current server (Ctrl+C)
pnpm dev
```

**Manual Test Steps:**

1. **Test Email Signup**
   - Go to http://localhost:3000
   - Click "Sign Up"
   - Enter email and password
   - Submit form
   - Check terminal for logs:
     ```
     [Para] Creating wallet for user: test@example.com
     [Para] ✓ Wallet created successfully: 0x...
     ```

2. **Verify in Database**
   ```sql
   SELECT
     user_id,
     email,
     wallet_address,
     created_at
   FROM para_wallets;
   ```
   Should see your new user's wallet

3. **Test OAuth Signup** (if configured)
   - Sign up with GitHub/Google
   - Should also create wallet automatically

4. **Test Anonymous Conversion**
   - Browse as anonymous user
   - Create some workflows
   - Sign up with email
   - Should create wallet + migrate data

**Expected Logs:**
```
[Para] Creating wallet for user: user@example.com
[Para] ✓ Wallet created successfully: 0x1234567890abcdef...
```

**Common Issues:**

| Issue | Solution |
|-------|----------|
| "PARA_API_KEY not configured" | Add to `.env.local` and restart server |
| "WALLET_ENCRYPTION_KEY must be..." | Generate 64-char hex key |
| Wallet creation fails silently | Check Para API key is valid |
| Database error | Run `pnpm db:push` again |

---

### Phase 5: Create Example Action

#### Step 9: Create Example Custom Action Using User Wallet

**Create directory:** `plugins/para/`

**File:** `plugins/para/icon.tsx`

```typescript
export function ParaIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"
        fill="currentColor"
      />
    </svg>
  );
}
```

**File:** `plugins/para/index.ts`

```typescript
import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { ParaIcon } from "./icon";

const paraPlugin: IntegrationPlugin = {
  type: "para",
  label: "Para Wallet",
  description: "Use your Para wallet to interact with blockchain",
  icon: ParaIcon,

  formFields: [], // No integration setup needed - uses user's wallet automatically

  actions: [
    {
      slug: "get-my-balance",
      label: "Get My Wallet Balance",
      description: "Get the balance of your Para wallet",
      category: "Para",
      stepFunction: "getMyBalanceStep",
      stepImportPath: "get-my-balance",
      configFields: [
        {
          key: "chainName",
          label: "Blockchain",
          type: "select",
          defaultValue: "ethereum",
          options: [
            { value: "ethereum", label: "Ethereum Mainnet" },
            { value: "polygon", label: "Polygon" },
            { value: "sepolia", label: "Sepolia Testnet" },
          ],
        },
        {
          key: "rpcUrl",
          label: "RPC URL (optional - uses default if empty)",
          type: "template-input",
          placeholder: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
        },
      ],
    },
    {
      slug: "send-native-token",
      label: "Send Native Token",
      description: "Send ETH, MATIC, or other native tokens",
      category: "Para",
      stepFunction: "sendNativeTokenStep",
      stepImportPath: "send-native-token",
      configFields: [
        {
          key: "recipientAddress",
          label: "Recipient Address",
          type: "template-input",
          placeholder: "0x... or {{NodeName.address}}",
          required: true,
        },
        {
          key: "amount",
          label: "Amount (in ETH)",
          type: "template-input",
          placeholder: "0.01",
          required: true,
        },
        {
          key: "rpcUrl",
          label: "RPC URL",
          type: "template-input",
          placeholder: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
          required: true,
        },
      ],
    },
  ],
};

registerIntegration(paraPlugin);
export default paraPlugin;
```

**Create directory:** `plugins/para/steps/`

**File:** `plugins/para/steps/get-my-balance.ts`

```typescript
import "server-only";
import { ethers } from "ethers";
import { getUserWallet } from "@/lib/para/wallet-helpers";

type GetMyBalanceInput = {
  chainName: string;
  rpcUrl?: string;
};

type GetMyBalanceResult = {
  address: string;
  balance: string;
  balanceFormatted: string;
  chain: string;
};

// Default RPC URLs for common chains
const DEFAULT_RPC_URLS: Record<string, string> = {
  ethereum: "https://eth.llamarpc.com",
  polygon: "https://polygon-rpc.com",
  sepolia: "https://rpc.sepolia.org",
};

export async function getMyBalanceStep(
  input: GetMyBalanceInput,
  context: { userId: string } // Workflow engine provides userId
): Promise<GetMyBalanceResult> {
  "use step";

  const { chainName, rpcUrl } = input;
  const { userId } = context;

  // Get user's wallet from database
  const wallet = await getUserWallet(userId);

  // Use provided RPC URL or default
  const finalRpcUrl = rpcUrl || DEFAULT_RPC_URLS[chainName];

  if (!finalRpcUrl) {
    throw new Error(`No RPC URL for chain: ${chainName}`);
  }

  // Get balance from blockchain
  const provider = new ethers.JsonRpcProvider(finalRpcUrl);
  const balance = await provider.getBalance(wallet.walletAddress);

  return {
    address: wallet.walletAddress,
    balance: balance.toString(),
    balanceFormatted: ethers.formatEther(balance),
    chain: chainName,
  };
}
```

**File:** `plugins/para/steps/send-native-token.ts`

```typescript
import "server-only";
import { ethers } from "ethers";
import { initializeParaSigner } from "@/lib/para/wallet-helpers";

type SendNativeTokenInput = {
  recipientAddress: string;
  amount: string;
  rpcUrl: string;
};

type SendNativeTokenResult = {
  transactionHash: string;
  from: string;
  to: string;
  amount: string;
  status: string;
};

export async function sendNativeTokenStep(
  input: SendNativeTokenInput,
  context: { userId: string }
): Promise<SendNativeTokenResult> {
  "use step";

  const { recipientAddress, amount, rpcUrl } = input;
  const { userId } = context;

  // Validate recipient address
  if (!ethers.isAddress(recipientAddress)) {
    throw new Error("Invalid recipient address");
  }

  // Initialize Para signer with user's wallet
  const signer = await initializeParaSigner(userId, rpcUrl);

  // Get signer address
  const fromAddress = await signer.getAddress();

  // Prepare transaction
  const tx = await signer.sendTransaction({
    to: recipientAddress,
    value: ethers.parseEther(amount),
  });

  // Wait for transaction to be mined
  const receipt = await tx.wait();

  return {
    transactionHash: receipt!.hash,
    from: fromAddress,
    to: recipientAddress,
    amount: amount,
    status: receipt!.status === 1 ? "success" : "failed",
  };
}
```

**File:** `plugins/para/test.ts`

```typescript
import "server-only";

export async function testPara(credentials: Record<string, string>) {
  // No credentials needed - uses user's wallet automatically
  return {
    success: true,
    error: undefined,
  };
}
```

**Run plugin discovery:**
```bash
pnpm discover-plugins
```

This will register the Para plugin and make it available in workflows.

---

## Usage Examples

### Example 1: Check Wallet Balance Workflow

```
Trigger: Manual Button
  ↓
Action: Para Wallet - Get My Wallet Balance
  - Blockchain: Ethereum Mainnet
  - RPC URL: (leave empty for default)
  ↓
Returns: { address: "0x...", balance: "1500000000000000000", balanceFormatted: "1.5" }
```

### Example 2: Send Token Workflow

```
Trigger: Webhook
  ↓
Action: Para Wallet - Send Native Token
  - Recipient: {{webhook.recipientAddress}}
  - Amount: 0.01
  - RPC URL: https://eth-sepolia.public.blastapi.io
  ↓
Action: Resend - Send Email
  - To: {{webhook.email}}
  - Subject: "Payment Sent"
  - Body: "Transaction: {{ParaWallet.transactionHash}}"
```

### Example 3: Multi-Chain Balance Check

```
Trigger: Schedule (daily)
  ↓
Action 1: Get Balance (Ethereum)
Action 2: Get Balance (Polygon)
Action 3: Get Balance (Sepolia)
  ↓
Action: Send Email with all balances
```

---

## Advanced: Custom Actions

### Template for Creating Your Own Para Actions

```typescript
// plugins/para/steps/your-action.ts
import "server-only";
import { initializeParaSigner, getUserWallet } from "@/lib/para/wallet-helpers";
import { ethers } from "ethers";

type YourActionInput = {
  // Your input parameters
  contractAddress: string;
  rpcUrl: string;
};

type YourActionResult = {
  // Your result data
  success: boolean;
  transactionHash?: string;
};

export async function yourActionStep(
  input: YourActionInput,
  context: { userId: string }
): Promise<YourActionResult> {
  "use step";

  const { contractAddress, rpcUrl } = input;
  const { userId } = context;

  try {
    // Get user's wallet
    const wallet = await getUserWallet(userId);

    // Initialize Para signer
    const signer = await initializeParaSigner(userId, rpcUrl);

    // Create contract instance
    const contract = new ethers.Contract(
      contractAddress,
      ["function yourFunction() external"],
      signer
    );

    // Call contract function
    const tx = await contract.yourFunction();
    const receipt = await tx.wait();

    return {
      success: true,
      transactionHash: receipt.hash,
    };
  } catch (error) {
    return {
      success: false,
      transactionHash: undefined,
    };
  }
}
```

### Common Use Cases

1. **NFT Minting**: Call mint function on NFT contract
2. **Token Swaps**: Interact with DEX contracts (Uniswap, etc.)
3. **DeFi Operations**: Stake, lend, borrow via protocol contracts
4. **DAO Voting**: Submit votes to governance contracts
5. **Multi-Sig Operations**: Sign multi-signature transactions

---

## Security Best Practices

### ✅ DO

- **Always encrypt userShare** before storing in database
- **Use server-only** directive for Para operations
- **Validate user input** (addresses, amounts, etc.)
- **Handle errors gracefully** without exposing sensitive data
- **Use environment variables** for API keys
- **Rotate encryption keys** periodically
- **Log wallet operations** for audit trail

### ❌ DON'T

- **Never send userShare to client**
- **Never log decrypted userShare**
- **Never commit encryption keys to git**
- **Never allow users to set arbitrary userShare**
- **Never skip address validation**
- **Never expose Para API key in client code**

---

## Troubleshooting

### Issue: Wallet Not Created on Signup

**Check:**
1. Para API key is set in `.env.local`
2. Development server was restarted after adding env vars
3. User has valid email address
4. Check server logs for error messages

**Solution:**
```bash
# Verify env vars are loaded
echo $PARA_API_KEY  # Should show your key

# Restart dev server
pnpm dev
```

---

### Issue: Encryption/Decryption Fails

**Check:**
1. `WALLET_ENCRYPTION_KEY` is exactly 64 characters (32 bytes hex)
2. Key hasn't changed since wallet creation
3. Database has encrypted data in correct format

**Solution:**
```bash
# Generate new key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# If key was changed, old wallets can't be decrypted
# Users will need to create new accounts
```

---

### Issue: Transaction Fails to Sign

**Check:**
1. User has wallet in database
2. RPC URL is correct and accessible
3. Wallet has gas for transaction
4. Contract ABI is correct

**Debug:**
```typescript
// Add logging to your step function
console.log("User ID:", userId);
console.log("Wallet address:", wallet.walletAddress);
console.log("RPC URL:", rpcUrl);

try {
  const balance = await provider.getBalance(wallet.walletAddress);
  console.log("Wallet balance:", ethers.formatEther(balance));
} catch (error) {
  console.error("Balance check failed:", error);
}
```

---

### Issue: Database Migration Fails

**Check:**
1. PostgreSQL is running
2. `DATABASE_URL` in `.env.local` is correct
3. Database user has permissions

**Solution:**
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# If schema exists but is incorrect, drop and recreate
pnpm db:push --force
```

---

## Testing Checklist

- [ ] Para API key configured in `.env.local`
- [ ] Encryption key generated and added to `.env.local`
- [ ] Database schema created (`pnpm db:push`)
- [ ] Development server restarted
- [ ] New user signup creates wallet (check logs)
- [ ] Wallet visible in database (`SELECT * FROM para_wallets`)
- [ ] Para plugin appears in workflow builder
- [ ] "Get My Balance" action works
- [ ] "Send Native Token" action works (use testnet!)
- [ ] Errors are logged without exposing sensitive data

---

## Next Steps

### Additional Actions to Build

1. **ERC-20 Token Transfer**
   - Send USDC, DAI, or other tokens
   - Check token balances

2. **Smart Contract Interaction**
   - Call any contract function
   - Read contract state

3. **NFT Operations**
   - Mint NFTs
   - Transfer NFTs
   - Check NFT ownership

4. **DeFi Integration**
   - Swap tokens on Uniswap
   - Provide liquidity
   - Stake tokens

5. **Multi-Chain Support**
   - Auto-detect chain from RPC URL
   - Chain-specific gas estimation

### Improvements

- Add transaction retry logic
- Implement gas estimation
- Add support for EIP-1559 transactions
- Cache provider instances
- Add transaction monitoring
- Implement transaction queuing

---

## Resources

- **Para Documentation**: https://docs.para.network
- **Ethers.js Docs**: https://docs.ethers.org/v6/
- **Better Auth Docs**: https://www.better-auth.com/docs
- **Workflow DevKit**: https://useworkflow.dev

---

## Support

If you encounter issues:

1. Check server logs for error messages
2. Verify all environment variables are set
3. Test with Sepolia testnet first
4. Check Para dashboard for API usage/errors
5. Review database to confirm wallet storage

---

## Summary

You now have:

✅ Automatic Para wallet creation on user signup
✅ Secure encrypted storage of wallet credentials
✅ Helper functions to use wallets in actions
✅ Example workflow actions (balance check, send tokens)
✅ Foundation to build custom blockchain actions

Every user who signs up will automatically receive their own EVM wallet, enabling powerful blockchain automation workflows!
