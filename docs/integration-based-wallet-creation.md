# Integration-Based Wallet Creation

## Overview

This document outlines the implementation plan for moving wallet creation from automatic (on user signup) to user-initiated (via Web3 integration in the integrations UI).

**Current Behavior:** Wallets are automatically created for users when they sign up via a database hook in `lib/auth.ts`.

**New Behavior:** Users manually create wallets through the Web3 integration card in the integrations UI.

---

## Architecture

### Data Model

```
users (1) ←──→ (1) para_wallets
```

- **`para_wallets` table**: Stores actual wallet data (address, walletId, encrypted userShare)
- **`web3` integration**: Users interact with Web3 integration in UI (no separate integration record for wallet)
- **Relationship**: One user can have max ONE wallet (enforced by unique constraint on `para_wallets.userId`)

### Why Keep para_wallets Table?

✅ **Dedicated wallet storage**: Clear separation of wallet infrastructure
✅ **Existing schema**: `para_wallets` table already exists and is perfect
✅ **Existing helpers**: All wallet helper functions in `lib/para/wallet-helpers.ts` continue to work
✅ **Data integrity**: Unique constraint ensures one wallet per user
✅ **Security**: Encrypted userShare stored separately from integration credentials

### Why Use API Route?

The wallet creation happens server-side because:

1. **Para SDK requires API keys** - Cannot expose `PARA_API_KEY` to browser
2. **Encryption is server-side** - `WALLET_ENCRYPTION_KEY` must stay secure
3. **Database access** - Direct writes to `para_wallets` table
4. **Para SDK operations** - Creating wallet, getting userShare

**Flow:**
```
Frontend Web3 Integration Card
  ↓ User clicks "Create Wallet"
  ↓ POST /api/user/wallet
    ↓ Server: Para SDK creates wallet
    ↓ Server: Encrypt userShare
    ↓ Server: Store in para_wallets table
  ↓ Return wallet info
Frontend shows wallet address
```

---

## Implementation Steps

### 1. Remove Auto-Creation from Auth Hook ✅

**File:** `lib/auth.ts`

**Action:** Remove the `databaseHooks.user.create.after` hook that creates wallets automatically on signup.

**Changes:**
- Remove Para SDK imports (`ParaServer`, `Environment`)
- Remove `paraWallets` schema import
- Remove `encryptUserShare` import
- Remove entire `databaseHooks` section

**Result:** New users will NOT get wallets automatically. They must create them manually via the Web3 integration.

---

### 2. Add Wallet Creation API Endpoint

**File:** `app/api/user/wallet/route.ts` (already has GET, add POST and DELETE)

#### POST /api/user/wallet - Create Wallet

```typescript
export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user;

    // 2. Check user has email
    if (!user.email) {
      return NextResponse.json(
        { error: "Email required to create wallet" },
        { status: 400 }
      );
    }

    // 3. Check if wallet already exists
    const hasWallet = await userHasWallet(user.id);
    if (hasWallet) {
      return NextResponse.json(
        { error: "Wallet already exists for this user" },
        { status: 400 }
      );
    }

    // 4. Initialize Para SDK
    const paraClient = new ParaServer(
      PARA_ENV === "prod" ? Environment.PROD : Environment.BETA,
      PARA_API_KEY
    );

    // 5. Create wallet via Para SDK
    console.log(`[Para] Creating wallet for user ${user.id} (${user.email})`);

    const wallet = await paraClient.createPregenWallet({
      type: "EVM",
      pregenId: { email: user.email },
    });

    // 6. Get user share (cryptographic key for signing)
    const userShare = await paraClient.getUserShare();

    // 7. Store wallet in para_wallets table
    await db.insert(paraWallets).values({
      userId: user.id,
      email: user.email,
      walletId: wallet.id,
      walletAddress: wallet.address,
      userShare: encryptUserShare(userShare), // Encrypted!
    });

    console.log(`[Para] ✓ Wallet created: ${wallet.address}`);

    // 8. Return success
    return NextResponse.json({
      success: true,
      wallet: {
        address: wallet.address,
        walletId: wallet.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("[Para] Wallet creation failed:", error);
    return NextResponse.json(
      {
        error: "Failed to create wallet",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

#### DELETE /api/user/wallet - Delete Wallet

```typescript
export async function DELETE(request: Request) {
  try {
    // 1. Authenticate user
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user;

    // 2. Delete wallet data
    const deletedWallet = await db
      .delete(paraWallets)
      .where(eq(paraWallets.userId, user.id))
      .returning();

    if (deletedWallet.length === 0) {
      return NextResponse.json(
        { error: "No wallet found to delete" },
        { status: 404 }
      );
    }

    console.log(
      `[Para] Wallet deleted for user ${user.id}: ${deletedWallet[0].walletAddress}`
    );

    return NextResponse.json({
      success: true,
      message: "Wallet deleted successfully",
    });
  } catch (error) {
    console.error("[Para] Wallet deletion failed:", error);
    return NextResponse.json(
      {
        error: "Failed to delete wallet",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

**Imports needed:**
```typescript
import { Environment, Para as ParaServer } from "@getpara/server-sdk";
import { db } from "@/lib/db";
import { paraWallets } from "@/lib/db/schema";
import { encryptUserShare } from "@/lib/encryption";
import { eq } from "drizzle-orm";
```

---

### 3. Update Web3 Plugin UI

**File:** `plugins/web3/index.ts`

Update the plugin to show wallet status and creation option:

```typescript
const web3Plugin: IntegrationPlugin = {
  type: "web3",
  label: "Web3",
  description: "Interact with blockchain networks using your Para wallet",
  icon: Web3Icon,

  // Update form fields to show wallet creation
  formFields: [
    {
      id: "wallet-status",
      label: "Para Wallet",
      type: "text",
      placeholder: "Create a wallet to use Web3 actions",
      configKey: "wallet_info",
      helpText: "Click 'Create Wallet' below to generate your Para wallet.",
    },
  ],

  // Actions stay the same
  actions: [
    {
      slug: "transfer-funds",
      label: "Transfer Funds",
      description: "Transfer ETH from your wallet to a recipient address",
      category: "Web3",
      stepFunction: "transferFundsStep",
      stepImportPath: "transfer-funds",
      configFields: [
        {
          key: "amount",
          label: "Amount (ETH)",
          type: "template-input",
          placeholder: "0.1 or {{NodeName.amount}}",
          example: "0.1",
          required: true,
        },
        {
          key: "recipientAddress",
          label: "Recipient Address",
          type: "template-input",
          placeholder: "0x... or {{NodeName.address}}",
          example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
          required: true,
        },
      ],
    },
  ],
};
```

---

### 4. Update Integration Form Dialog

**File:** `components/settings/integration-form-dialog.tsx`

Add special handling for Web3 integration to show wallet creation UI instead of standard form:

**Option A: Custom UI for web3 type**
```typescript
// In IntegrationFormDialog component, add check:
if (formData.type === "web3") {
  // Show custom wallet creation UI
  return <Web3WalletCreationUI />;
}
```

**Option B: Add custom button in form**
```typescript
// After form fields, for web3 type:
{formData.type === "web3" && (
  <Button onClick={handleCreateWallet}>
    Create Para Wallet
  </Button>
)}
```

**Implementation details:**
- Check if user has wallet: `GET /api/user/wallet`
- If no wallet: Show "Create Wallet" button
- If has wallet: Show wallet address and "Delete" button
- On create: `POST /api/user/wallet`
- On delete: `DELETE /api/user/wallet` with confirmation

---

### 5. Frontend Component Example

**New Component:** `components/settings/web3-wallet-section.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

export function Web3WalletSection() {
  const [hasWallet, setHasWallet] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Check wallet status on mount
  useEffect(() => {
    async function checkWallet() {
      try {
        const response = await fetch("/api/user/wallet");
        const data = await response.json();

        if (data.hasWallet) {
          setHasWallet(true);
          setWalletAddress(data.walletAddress);
        }
      } catch (error) {
        console.error("Failed to check wallet:", error);
      } finally {
        setLoading(false);
      }
    }

    checkWallet();
  }, []);

  async function handleCreateWallet() {
    setCreating(true);
    try {
      const response = await fetch("/api/user/wallet", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create wallet");
      }

      setHasWallet(true);
      setWalletAddress(data.wallet.address);
      toast.success("Wallet created successfully!");
    } catch (error) {
      console.error("Wallet creation failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create wallet"
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteWallet() {
    if (!confirm("Are you sure? This cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch("/api/user/wallet", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete wallet");
      }

      setHasWallet(false);
      setWalletAddress(null);
      toast.success("Wallet deleted");
    } catch (error) {
      toast.error("Failed to delete wallet");
    }
  }

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">Para Wallet</h3>
        <p className="text-sm text-muted-foreground">
          Use your email address to pre-generate a wallet for Web3 automations.
        </p>
      </div>

      {!hasWallet ? (
        <Button onClick={handleCreateWallet} disabled={creating}>
          {creating ? "Creating..." : "Create Wallet"}
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">Address:</span>
            <code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
              {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
            </code>
          </div>
          <Button variant="destructive" size="sm" onClick={handleDeleteWallet}>
            Delete Wallet
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

## Database Migration

### Check if para_wallets table exists

The `para_wallets` table is defined in `lib/db/schema.ts` but may not have a migration yet.

**Run:**
```bash
npm run db:generate  # Generate migration if needed
npm run db:migrate   # Apply migration
```

**Expected schema:**
```sql
CREATE TABLE "para_wallets" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL UNIQUE,
  "email" text NOT NULL,
  "wallet_id" text NOT NULL,
  "wallet_address" text NOT NULL,
  "user_share" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "para_wallets_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
```

---

## Testing Checklist

### Backend Tests

- [ ] `POST /api/user/wallet` creates wallet successfully
- [ ] `POST /api/user/wallet` returns error if wallet exists
- [ ] `POST /api/user/wallet` returns error if no email
- [ ] `POST /api/user/wallet` returns 401 if not authenticated
- [ ] `DELETE /api/user/wallet` deletes wallet successfully
- [ ] `DELETE /api/user/wallet` returns 404 if no wallet
- [ ] `GET /api/user/wallet` returns wallet info if exists
- [ ] `GET /api/user/wallet` returns hasWallet:false if none

### Frontend Tests

- [ ] Web3 integration shows "Create Wallet" button when no wallet
- [ ] Clicking "Create Wallet" calls API and shows success
- [ ] After creation, wallet address is displayed
- [ ] "Delete" button appears after wallet created
- [ ] Delete confirmation dialog works
- [ ] After delete, UI resets to "Create Wallet" state

### Integration Tests

- [ ] New user signup does NOT create wallet automatically
- [ ] User can create wallet via Web3 integration
- [ ] Web3 actions (transfer-funds) work with created wallet
- [ ] Cannot create second wallet (unique constraint)
- [ ] Wallet persists across sessions
- [ ] Wallet deletion removes data from database

---

## Environment Variables

No new environment variables needed. Existing ones:

- `PARA_API_KEY` - Para SDK API key (required)
- `PARA_ENVIRONMENT` - "beta" or "prod" (default: "beta")
- `WALLET_ENCRYPTION_KEY` - 32-byte hex string for AES-256-GCM encryption (required)

---

## Migration for Existing Users

If you already have users with auto-created wallets, they will continue to work. No migration needed since the `para_wallets` table structure stays the same.

New users will need to manually create wallets via the Web3 integration.

---

## Future: Organization Support

When you add organizations later:

1. Add `organizationId` to `para_wallets` table
2. Change ownership from user → organization
3. Multiple users in org can access shared wallet
4. Wallet creation happens at org level (not user level)

The current architecture supports this future migration well!

---

## Summary

**Changes Required:**

1. ✅ Remove auto-creation hook from `lib/auth.ts`
2. ⏳ Add POST/DELETE to `app/api/user/wallet/route.ts`
3. ⏳ Update `plugins/web3/index.ts` description/help text
4. ⏳ Add wallet creation UI to integration dialog
5. ⏳ Generate/run database migration for `para_wallets`
6. ⏳ Test end-to-end flow

**Key Benefits:**

- ✅ User-controlled wallet creation
- ✅ Keeps existing wallet infrastructure
- ✅ No breaking changes to Web3 actions
- ✅ Clean API boundaries (server-side Para SDK)
- ✅ Ready for future organization support
