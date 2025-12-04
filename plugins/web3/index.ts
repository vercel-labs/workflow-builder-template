import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { Web3Icon } from "./icon";

const web3Plugin: IntegrationPlugin = {
  type: "web3",
  label: "Web3",
  description: "Interact with blockchain networks - transfer funds, read/write smart contracts, and more",

  icon: Web3Icon,

  // Minimal form field - Web3 uses PARA wallet (auto-created for users)
  // This field is informational only and not used
  formFields: [
    {
      id: "info",
      label: "Note",
      type: "text",
      placeholder: "Web3 uses your PARA wallet (auto-created on signup)",
      configKey: "info",
      helpText: "No configuration needed. Your PARA wallet is automatically available.",
    },
  ],

  // No test function needed - no credentials to test
  // testConfig is optional, so we omit it

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

// Auto-register on import
registerIntegration(web3Plugin);

export default web3Plugin;
