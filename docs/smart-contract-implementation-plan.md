# Read Smart Contract Action - Implementation Plan

## Overview
Create a Web3 action that allows users to read data from smart contracts by:
1. Inputting contract address
2. Fetching ABI automatically
3. Displaying available read-only functions (view/pure)
4. Selecting a function to call
5. Providing arguments for the function
6. Executing the call and returning the result

**Note**: This action is for read-only operations. A separate "Write Contract" action will be created for state-changing transactions.

## Bare Bones MVP Requirements

### 1. Contract Input
- Field for contract address (template-input)
- Field for network/chain selection (select dropdown)
  - Options: Ethereum Mainnet, Sepolia Testnet, etc.

### 2. ABI Fetch
- Field for manual ABI input (textarea or schema-builder)
- Auto-fetch from Etherscan API (if API key available)
- Validate ABI format

### 3. Functions Display
- Parse ABI to extract read-only functions (view/pure)
- Display functions in a select dropdown
- Show function name and parameters

### 4. Function Selection
- Select field for choosing a function
- Dynamic form fields based on selected function's parameters

### 5. Argument Input
- Generate input fields for each function parameter
- Use template-input for dynamic values
- Support basic types: address, uint256, string, bool

### 6. Execution
- Call the contract function using ethers.js
- Handle read-only (view/pure) functions only
- Return the result as step output
- Handle errors appropriately

## File Structure

```
plugins/web3/
├── index.ts                          # Update with new action
├── steps/
│   ├── transfer-funds.ts            # Existing
│   └── read-contract.ts             # NEW - Core logic
└── icon.tsx                          # Existing
```

## Implementation Steps

### Step 1: Create Action Definition
**File**: `plugins/web3/index.ts`

Add new action definition:
```typescript
{
  slug: "read-contract",
  label: "Read Contract",
  description: "Call any function on a smart contract",
  category: "Web3",
  stepFunction: "readContractStep",
  stepImportPath: "read-contract",
  configFields: [
    // Contract address
    // Network selection
    // ABI input
    // Function selection
    // Dynamic argument inputs
  ]
}
```

### Step 2: Create Step Handler
**File**: `plugins/web3/steps/read-contract.ts`

Core functionality:
- Input type definition
- ABI validation
- Contract instantiation using ethers.js
- Function execution (read-only)
- Result formatting

### Step 3: Config Fields

#### Basic Fields:
1. **contractAddress** (template-input)
   - Label: "Contract Address"
   - Placeholder: "0x... or {{NodeName.address}}"

2. **network** (select)
   - Label: "Network"
   - Options: mainnet, sepolia, etc.

3. **abi** (template-textarea)
   - Label: "Contract ABI"
   - Placeholder: "Paste ABI JSON"

4. **functionName** (select)
   - Label: "Function"
   - Options: Parsed from ABI (dynamic) - read-only functions only

5. **functionArgs** (schema-builder or JSON input)
   - Label: "Function Arguments"
   - Dynamic based on selected function

## Technical Considerations

### Dependencies
- ethers.js (already installed)
- RPC endpoint URLs for each network

### ABI Handling
- Parse JSON ABI
- Extract read-only functions (view/pure)
- Extract function signatures and parameters

### Contract Interaction
```typescript
import { ethers } from "ethers";

// For read-only functions (view/pure)
const provider = new ethers.JsonRpcProvider(rpcUrl);
const contract = new ethers.Contract(address, abi, provider);
const result = await contract[functionName](...args);
```

### Error Handling
- Invalid contract address
- Invalid ABI format
- Function doesn't exist
- Wrong number of arguments
- Network connection issues
- Contract execution reverts
- Insufficient gas/funds

## Future Enhancements (Out of Scope for MVP)

- Auto-fetch ABI from Etherscan/block explorer
- Support for struct/tuple parameters
- Support for array parameters
- Decode complex return types
- Add block number specification
- Support for more networks
- Cache ABI lookups
- Gas estimation

## MVP Testing Plan

1. Deploy simple test contract on Sepolia
2. Test reading a view function (e.g., `totalSupply()`)
3. Test reading with parameters (e.g., `balanceOf(address)`)
4. Test error cases (invalid address, wrong args)

## Notes

- Keep it simple - no complex UI interactions
- Reuse existing field types from action-config-renderer
- Focus on core functionality first
- Use existing Web3 plugin structure as template
- All fields should support template variables ({{NodeName.field}})
- Read-only, no wallet/signer needed (just provider)
