# Para Wallet - Send Sepolia ETH Workflow Step

## Goal

Create a workflow step that allows users to send ETH on the Sepolia testnet using their Para wallet.

## File locations

- Plugin definition: plugins/[name]/index.ts
- Step implementation: plugins/[name]/steps/[step-name].ts
- Step registry: lib/step-registry.ts (auto-generated)
- Workflow executor: lib/workflow-executor.workflow.ts
- Step handler utilities: lib/steps/step-handler.ts

## For this step

You'll need to:

- Create plugins/para/index.ts — register the plugin
- Create plugins/para/steps/send-eth.ts — step implementation
- Access userId — look up from executionId via workflowExecutions table
- Use wallet helpers — initializeParaSigner(userId, rpcUrl) from lib/para/wallet-helpers.ts
- Define config fields — amount and recipientAddress in plugin registration
- The PARA integration already exists (wallet creation, encryption, helpers), so you're adding a step that uses it.

## Current Status

- ✅ Para wallet integration is complete (wallets auto-created on user signup)
- ✅ Wallet addresses display in user dropdown menu

## What Works

1. Users automatically get a Para wallet when they sign up
2. Wallet keyshares are encrypted and stored securely in the database

## What Doesn't Work

Nothing about the step is yet implemented

## The Issue

## Next Steps

## Key Files
