# Contributing to Workflow Builder

Thank you for your interest in contributing to the Workflow Builder project! We're excited to have you here and appreciate your help in making this platform better for everyone.

## Table of Contents

- [Ways to Contribute](#ways-to-contribute)
- [Getting Started](#getting-started)
- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Adding a New Integration](#adding-a-new-integration)
- [Plugin Development Guide](#plugin-development-guide)
- [Testing Guidelines](#testing-guidelines)
- [Need Help?](#need-help)

## Ways to Contribute

There are many ways to contribute to Workflow Builder:

- **Report bugs**: Found something broken? Let us know!
- **Suggest features**: Have an idea? We'd love to hear it
- **Improve documentation**: Help make our docs clearer
- **Add integrations**: Expand the platform with new service integrations
- **Fix issues**: Pick up an issue from our backlog
- **Improve code quality**: Refactoring, tests, performance improvements

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/workflow-builder-template.git
   cd workflow-builder-template
   ```
3. **Install dependencies**:
   ```bash
   pnpm install
   ```
4. **Set up your environment**:
   - Copy `.env.example` to `.env.local`
   - Add required environment variables (see below)
5. **Run the development server**:
   ```bash
   pnpm dev
   ```

## Code of Conduct

We're committed to providing a welcoming and inclusive environment for all contributors. Please:

- Be respectful and considerate in your interactions
- Welcome newcomers and help them get started
- Focus on what's best for the community
- Show empathy towards other community members

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm (our package manager of choice)
- PostgreSQL (for database integrations)

### Environment Variables

Required variables for development:

```bash
# Database
DATABASE_URL=postgres://localhost:5432/workflow

# Authentication
BETTER_AUTH_SECRET=your-auth-secret-here  # Generate with: openssl rand -base64 32

# Credentials Encryption
INTEGRATION_ENCRYPTION_KEY=your-64-character-hex-string  # Generate with: openssl rand -hex 32

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optional OAuth providers (configure at least one for authentication):

```bash
# GitHub
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
NEXT_PUBLIC_GITHUB_CLIENT_ID=

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

See `.env.example` for the complete list of available environment variables.

### Development Workflow

1. Create a new branch for your changes:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and test thoroughly

3. Run quality checks:

   ```bash
   pnpm type-check  # TypeScript validation
   pnpm fix         # Auto-fix linting issues
   pnpm build       # Ensure it builds successfully
   ```

4. Commit your changes:

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. Push to your fork and create a pull request

## Pull Request Process

### Before Submitting

- ✅ All tests pass
- ✅ Code follows the project's style guidelines (`pnpm fix`)
- ✅ TypeScript compiles without errors (`pnpm type-check`)
- ✅ Your changes are well-documented
- ✅ You've tested your changes thoroughly

### PR Guidelines

1. **Clear title**: Use conventional commit format (e.g., `feat:`, `fix:`, `docs:`)
2. **Detailed description**: Explain what and why, not just how
3. **Screenshots**: Include for UI changes
4. **Breaking changes**: Clearly document any breaking changes
5. **Link issues**: Reference related issues (e.g., "Fixes #123")

### Review Process

All contributions go through a review process to ensure quality, security, and alignment with the project's goals. Our team reviews each submission with care, focusing on:

- **Security**: Protecting user data and system integrity
- **User value**: Ensuring the contribution benefits our users
- **Code quality**: Maintaining high standards for maintainability
- **Compatibility**: Ensuring it works well with existing features

We do our best to review submissions promptly, though please understand that not every contribution can be merged. We may provide feedback for improvements or, in some cases, decline contributions that don't align with the project's direction. We appreciate every contribution and will always explain our reasoning if changes are requested or a PR cannot be accepted.

---

## Adding a New Integration

The Workflow Builder uses a **modular plugin-based system** that makes adding integrations straightforward and organized. Each integration lives in its own directory with all its components self-contained.

### Quick Overview

Adding an integration requires:

1. Create a plugin directory with modular files
2. Run `pnpm discover-plugins` (auto-generates types)
3. Test your integration

That's it! The system handles registration and discovery automatically.

### Quick Start

```bash
pnpm create-plugin
```

This launches an interactive wizard that asks for:
- **Integration name** (e.g., "Stripe")
- **Integration description** (e.g., "Process payments with Stripe")
- **Action name** (e.g., "Create Payment")
- **Action description** (e.g., "Creates a new payment intent")

The script creates the full plugin structure with integration and action names filled in, then registers it automatically. You'll still need to customize the generated files (API logic, input/output types, icon, etc.).

Once you've built your plugin, run `pnpm dev` to test!

Let's go through each file in detail.

---

## Plugin Development Guide

### Plugin System Overview

The plugin system uses a **modular file structure** where each integration is self-contained:

```
plugins/my-integration/
├── credentials.ts        # Credential type definition
├── icon.tsx              # Icon component (SVG)
├── index.ts              # Plugin definition (ties everything together)
├── steps/                # Action implementations
│   └── my-action.ts      # Server-side step function with stepHandler
└── test.ts               # Connection test function
```

**Key Benefits:**

- **Modular**: Each concern is in its own file
- **Organized**: All integration code in one directory
- **Scalable**: Easy to add new actions
- **Self-contained**: No scattered files across the codebase
- **Auto-discovered**: Automatically detected by `pnpm discover-plugins`
- **Declarative**: Action config fields defined as data, not React components
- **Write once**: Step logic works for both the app and exported workflows

### Step-by-Step Plugin Creation

#### Step 1: Create Plugin Directory Structure

```bash
mkdir -p plugins/my-integration/steps
```

#### Step 2: Create Icon Component

**File:** `plugins/my-integration/icon.tsx`

```tsx
export function MyIntegrationIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-label="My Integration logo"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>My Integration</title>
      <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z" />
    </svg>
  );
}
```

**OR** use a Lucide icon directly in your index.ts (skip this file if using Lucide).

#### Step 3: Create Credentials Type

**File:** `plugins/my-integration/credentials.ts`

This defines the credential type shared between app and export code:

```typescript
export type MyIntegrationCredentials = {
  MY_INTEGRATION_API_KEY?: string;
  // Add other credential fields as needed
};
```

#### Step 4: Create Test Function

**File:** `plugins/my-integration/test.ts`

This function validates that credentials work:

```typescript
export async function testMyIntegration(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.MY_INTEGRATION_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "MY_INTEGRATION_API_KEY is required",
      };
    }

    const response = await fetch("https://api.my-integration.com/test", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { success: true };
    }

    const error = await response.text();
    return { success: false, error };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
```

#### Step 5: Create Step Function (Server Logic)

**File:** `plugins/my-integration/steps/send-message.ts`

This runs on the server during workflow execution. Steps have two parts:

1. `stepHandler` - Core logic that receives credentials as a parameter
2. `sendMessageStep` - Entry point that fetches credentials and wraps with logging

```typescript
import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { MyIntegrationCredentials } from "../credentials";

type SendMessageResult =
  | { success: true; id: string; url: string }
  | { success: false; error: string };

// Core input fields (without app-specific context)
export type SendMessageCoreInput = {
  message: string;
  channel: string;
};

// App input includes integrationId and step context
export type SendMessageInput = StepInput &
  SendMessageCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic
 */
async function stepHandler(
  input: SendMessageCoreInput,
  credentials: MyIntegrationCredentials
): Promise<SendMessageResult> {
  const apiKey = credentials.MY_INTEGRATION_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "MY_INTEGRATION_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  try {
    const response = await fetch("https://api.my-integration.com/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        message: input.message,
        channel: input.channel,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      success: true,
      id: result.id,
      url: result.url,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to send message: ${getErrorMessage(error)}`,
    };
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function sendMessageStep(
  input: SendMessageInput
): Promise<SendMessageResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "my-integration";
```

**Key Points:**

1. **`stepHandler`**: Contains the core business logic, receives credentials as a parameter
2. **`[action]Step`**: Entry point that fetches credentials and wraps with logging
3. **`_integrationType`**: Integration identifier for this step
4. **Credentials type**: Import from `../credentials` for type safety

#### Step 6: Create Plugin Index

**File:** `plugins/my-integration/index.ts`

This ties everything together. The plugin uses a **declarative approach** where action config fields are defined as data (not React components):

```typescript
import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { MyIntegrationIcon } from "./icon";

const myIntegrationPlugin: IntegrationPlugin = {
  type: "my-integration",
  label: "My Integration",
  description: "Send messages and create records",

  // Direct component reference
  icon: MyIntegrationIcon,

  // Form fields for integration settings (API keys, etc.)
  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "sk_...",
      configKey: "apiKey",
      envVar: "MY_INTEGRATION_API_KEY", // Maps to environment variable
      helpText: "Get your API key from ",
      helpLink: {
        text: "my-integration.com",
        url: "https://my-integration.com/api-keys",
      },
    },
  ],

  // Lazy-loaded test function (avoids bundling server code in client)
  testConfig: {
    getTestFunction: async () => {
      const { testMyIntegration } = await import("./test");
      return testMyIntegration;
    },
  },

  // Actions provided by this integration
  actions: [
    {
      slug: "send-message", // Action ID: "my-integration/send-message"
      label: "Send Message",
      description: "Send a message to a channel",
      category: "My Integration",
      stepFunction: "sendMessageStep",
      stepImportPath: "send-message",
      // Output fields for template autocomplete (what this action returns)
      outputFields: [
        { field: "id", description: "Message ID" },
        { field: "url", description: "Message URL" },
      ],
      // Declarative config fields (not React components)
      configFields: [
        {
          key: "message",
          label: "Message",
          type: "template-input", // Supports {{NodeName.field}} syntax
          placeholder: "Enter message or use {{NodeName.field}}",
          required: true,
        },
        {
          key: "channel",
          label: "Channel",
          type: "text",
          placeholder: "#general",
        },
      ],
    },
    // Add more actions as needed
  ],
};

// Auto-register on import
registerIntegration(myIntegrationPlugin);

export default myIntegrationPlugin;
```

**Key Points:**

1. **Icon**: Direct component reference (not an object with type/value)
2. **envVar**: Maps formField to environment variable (auto-generates credential mapping)
3. **getTestFunction**: Lazy-loads test function to avoid bundling server code
4. **slug**: Action identifier (full ID becomes `my-integration/send-message`)
5. **outputFields**: Defines what fields the action returns (for template autocomplete)
6. **configFields**: Declarative array defining UI fields (not React components)

**Output Fields:**

The `outputFields` array defines what fields the action returns, enabling autocomplete when referencing this action's output in subsequent steps:

```typescript
outputFields: [
  { field: "id", description: "Message ID" },
  { field: "url", description: "Message URL" },
  { field: "items", description: "Array of items" }, // For arrays, just use the array name
],
```

These fields appear in the template variable dropdown when users type `@` in a template input field. The `field` should match the property names in your step's return type.

**Supported configField types:**
- `template-input`: Single-line input with `{{variable}}` support
- `template-textarea`: Multi-line textarea with `{{variable}}` support
- `text`: Plain text input
- `number`: Number input (with optional `min` property)
- `select`: Dropdown (requires `options` array)
- `schema-builder`: JSON schema builder for structured output
- `group`: Groups related fields in a collapsible section

#### Step 7: Run Plugin Discovery

The `discover-plugins` script auto-generates type definitions and registries:

```bash
pnpm discover-plugins
```

#### Step 8: Test Your Integration

```bash
pnpm type-check
pnpm fix
pnpm dev
```

Navigate to the app and:

1. Go to Settings → Integrations
2. Add your new integration
3. Configure it with test credentials
4. Click "Test Connection"
5. Create a workflow using your new action
6. Test that it executes correctly!

---

## Testing Guidelines

### Integration Testing Checklist

- [ ] **Connection Test**: Test function validates credentials correctly
- [ ] **Workflow Execution**: Action executes successfully in a workflow
- [ ] **Error Handling**: Invalid credentials show helpful error messages
- [ ] **Code Generation**: Export produces valid standalone code
- [ ] **Template Variables**: `{{NodeName.field}}` references work correctly
- [ ] **Edge Cases**: Test with missing/invalid inputs

### Running Tests

```bash
# Type check
pnpm type-check

# Lint and auto-fix
pnpm fix

# Build
pnpm build

# Development server
pnpm dev
```

---

## Examples

### Example 1: Firecrawl Integration

See `plugins/firecrawl/` for a complete, production-ready example with:

- Custom SVG icon
- Multiple actions (Scrape, Search)
- Declarative config fields
- Lazy-loaded test function

### Example 2: Using Lucide Icons

You can use a Lucide icon directly instead of creating a custom SVG:

```typescript
// In index.ts
import { Zap } from "lucide-react";

const plugin: IntegrationPlugin = {
  // ...
  icon: Zap, // Direct component reference
  // ...
};
```

### Example 3: Multiple Actions

```typescript
actions: [
  {
    slug: "send-message",
    label: "Send Message",
    description: "Send a message",
    category: "My Integration",
    stepFunction: "sendMessageStep",
    stepImportPath: "send-message",
    outputFields: [
      { field: "id", description: "Message ID" },
      { field: "timestamp", description: "Send timestamp" },
    ],
    configFields: [
      { key: "message", label: "Message", type: "template-input" },
      { key: "channel", label: "Channel", type: "text" },
    ],
  },
  {
    slug: "create-record",
    label: "Create Record",
    description: "Create a new record",
    category: "My Integration",
    stepFunction: "createRecordStep",
    stepImportPath: "create-record",
    outputFields: [
      { field: "id", description: "Record ID" },
      { field: "url", description: "Record URL" },
    ],
    configFields: [
      { key: "title", label: "Title", type: "template-input", required: true },
      { key: "description", label: "Description", type: "template-textarea" },
    ],
  },
],
```

---

## Common Patterns

### Pattern 1: Step Function Structure

Steps follow a consistent structure:

```typescript
import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { MyIntegrationCredentials } from "../credentials";

type MyResult = { success: true; data: string } | { success: false; error: string };

// Core input (without app-specific fields)
export type MyCoreInput = {
  field1: string;
};

// App input (extends core with integrationId and step context)
export type MyInput = StepInput & MyCoreInput & {
  integrationId?: string;
};

// 1. stepHandler - Core logic, receives credentials as parameter
async function stepHandler(
  input: MyCoreInput,
  credentials: MyIntegrationCredentials
): Promise<MyResult> {
  const apiKey = credentials.MY_INTEGRATION_API_KEY;
  if (!apiKey) {
    return { success: false, error: "API key not configured" };
  }

  try {
    const response = await fetch(/* ... */);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: `Failed to execute: ${getErrorMessage(error)}`,
    };
  }
}

// 2. App entry point - fetches credentials and wraps with logging
export async function myStep(input: MyInput): Promise<MyResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

// 3. Integration identifier
export const _integrationType = "my-integration";
```

### Pattern 2: Declarative Config Fields

Action config fields are defined declaratively in the plugin index:

```typescript
configFields: [
  // Template input (supports {{NodeName.field}} syntax)
  {
    key: "message",
    label: "Message",
    type: "template-input",
    placeholder: "Enter value or {{NodeName.field}}",
    required: true,
  },
  // Multi-line textarea
  {
    key: "body",
    label: "Body",
    type: "template-textarea",
    rows: 5,
  },
  // Select dropdown
  {
    key: "priority",
    label: "Priority",
    type: "select",
    options: [
      { value: "low", label: "Low" },
      { value: "high", label: "High" },
    ],
    defaultValue: "low",
  },
  // Number input
  {
    key: "limit",
    label: "Limit",
    type: "number",
    min: 1,
    defaultValue: "10",
  },
  // Conditional field (only shown when another field matches)
  {
    key: "customOption",
    label: "Custom Option",
    type: "text",
    showWhen: { field: "priority", equals: "high" },
  },
],
```

---

## Need Help?

If you run into issues:

1. Check the template files in `plugins/_template/`
2. Look at existing integrations like `plugins/firecrawl/`
3. Ensure all file names match your imports
4. Run `pnpm type-check` to catch type errors
5. Run `pnpm fix` to auto-fix linting issues
6. Open an issue on GitHub or start a discussion

---

## Summary

**Adding an integration requires:**

1. Create plugin directory with 4-5 files:
   - `credentials.ts` - Credential type definition
   - `icon.tsx` - Icon component (or use Lucide)
   - `index.ts` - Plugin definition
   - `steps/[action].ts` - Step function(s) with `stepHandler`
   - `test.ts` - Connection test function
2. Run `pnpm discover-plugins` to register the plugin
3. Test thoroughly

Each integration is self-contained in one organized directory, making it easy to develop, test, and maintain. Happy building!

---

## Questions?

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and community support
- **Pull Requests**: For code contributions

Thank you for contributing to Workflow Builder! Your efforts help make this platform better for everyone. 💙
