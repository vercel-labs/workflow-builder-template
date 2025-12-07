import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { Web3Icon } from "./icon";

const web3Plugin: IntegrationPlugin = {
  type: "web3",
  label: "Web3",
  description: "Interact with blockchain networks using your Para wallet",

  icon: Web3Icon,

  // Minimal form field - Web3 uses PARA wallet (user must create manually)
  // This field is informational only and not used
  formFields: [
    {
      id: "info",
      label: "Para Wallet",
      type: "text",
      placeholder: "Create a wallet to use Web3 actions",
      configKey: "info",
      helpText: "You'll need to create a Para wallet to use Web3 actions in your workflows.",
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
    {
      slug: "read-contract",
      label: "Read Contract",
      description: "Read data from a smart contract (view/pure functions)",
      category: "Web3",
      stepFunction: "readContractStep",
      stepImportPath: "read-contract",
      outputFields: [
        {
          field: "success",
          description: "Whether the contract call succeeded",
        },
        {
          field: "result",
          description: "The contract function return value (structured based on ABI outputs)",
        },
        {
          field: "error",
          description: "Error message if the call failed",
        },
      ],
      configFields: [
        {
          key: "network",
          label: "Network",
          type: "select",
          placeholder: "Select network",
          required: true,
          options: [
            { label: "Ethereum Mainnet", value: "mainnet" },
            { label: "Sepolia Testnet", value: "sepolia" },
          ],
        },
        {
          key: "contractAddress",
          label: "Contract Address",
          type: "template-input",
          placeholder: "0x... or {{NodeName.contractAddress}}",
          example: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
          required: true,
        },
        {
          key: "abi",
          label: "Contract ABI",
          type: "template-textarea",
          placeholder: "Paste contract ABI JSON here",
          rows: 6,
          required: true,
        },
        {
          key: "abiFunction",
          label: "Function",
          type: "abi-function-select",
          abiField: "abi",
          placeholder: "Select a function",
          required: true,
        },
        {
          key: "functionArgs",
          label: "Function Arguments",
          type: "abi-function-args",
          abiField: "abi",
          abiFunctionField: "abiFunction",
        },
      ],
    },
    {
      slug: "write-contract",
      label: "Write Contract",
      description: "Write data to a smart contract (state-changing functions)",
      category: "Web3",
      stepFunction: "writeContractStep",
      stepImportPath: "write-contract",
      outputFields: [
        {
          field: "success",
          description: "Whether the contract call succeeded",
        },
        {
          field: "transactionHash",
          description: "The transaction hash of the successful write",
        },
        {
          field: "result",
          description: "The contract function return value (if any)",
        },
        {
          field: "error",
          description: "Error message if the call failed",
        },
      ],
      configFields: [
        {
          key: "network",
          label: "Network",
          type: "select",
          placeholder: "Select network",
          required: true,
          options: [
            { label: "Ethereum Mainnet", value: "mainnet" },
            { label: "Sepolia Testnet", value: "sepolia" },
          ],
        },
        {
          key: "contractAddress",
          label: "Contract Address",
          type: "template-input",
          placeholder: "0x... or {{NodeName.contractAddress}}",
          example: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
          required: true,
        },
        {
          key: "abi",
          label: "Contract ABI",
          type: "template-textarea",
          placeholder: "Paste contract ABI JSON here",
          rows: 6,
          required: true,
        },
        {
          key: "abiFunction",
          label: "Function",
          type: "abi-function-select",
          abiField: "abi",
          functionFilter: "write",
          placeholder: "Select a function",
          required: true,
        },
        {
          key: "functionArgs",
          label: "Function Arguments",
          type: "abi-function-args",
          abiField: "abi",
          abiFunctionField: "abiFunction",
        },
      ],
    },
  ],
};

// Auto-register on import
registerIntegration(web3Plugin);

export default web3Plugin;
