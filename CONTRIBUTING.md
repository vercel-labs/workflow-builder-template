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
   git clone https://github.com/your-username/v8-workflow.git
   cd v8-workflow
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
2. Add your integration type to the database schema
3. Import your plugin
4. Run database migrations
5. Test your integration

That's it! The system handles registration and discovery automatically.

### Quick Start

```bash
# 1. Create your plugin directory structure
mkdir -p plugins/my-integration/steps/my-action
mkdir -p plugins/my-integration/codegen

# 2. Copy template files
cp plugins/_template/icon.tsx.txt plugins/my-integration/icon.tsx
cp plugins/_template/settings.tsx.txt plugins/my-integration/settings.tsx
cp plugins/_template/test.ts.txt plugins/my-integration/test.ts
cp plugins/_template/steps/action/step.ts.txt plugins/my-integration/steps/my-action/step.ts
cp plugins/_template/steps/action/config.tsx.txt plugins/my-integration/steps/my-action/config.tsx
cp plugins/_template/codegen/action.ts.txt plugins/my-integration/codegen/my-action.ts
cp plugins/_template/index.tsx.txt plugins/my-integration/index.tsx

# 3. Fill in the templates with your integration details

# 4. Add your integration type to lib/db/integrations.ts

# 5. Generate and apply database migration
pnpm db:generate
pnpm db:push

# 6. Test it!
pnpm dev
```

Now let's go through each step in detail.

---

## Plugin Development Guide

### Plugin System Overview

The plugin system uses a **modular file structure** where each integration is self-contained:

```
plugins/my-integration/
├── icon.tsx              # Icon component (optional if using Lucide)
├── settings.tsx          # Settings UI for credential configuration
├── test.ts              # Connection test function
├── steps/               # Action implementations
│   └── my-action/
│       ├── step.ts      # Server-side step function
│       └── config.tsx   # Client-side UI for configuring the action
├── codegen/             # Export templates for standalone workflows
│   └── my-action.ts     # Code generation template
└── index.tsx            # Plugin definition (ties everything together)
```

**Key Benefits:**

- **Modular**: Each concern is in its own file
- **Organized**: All integration code in one directory
- **Scalable**: Easy to add new actions
- **Self-contained**: No scattered files across the codebase
- **Discoverable**: Automatically detected by the system

### Step-by-Step Plugin Creation

#### Step 1: Create Plugin Directory Structure

```bash
mkdir -p plugins/my-integration/steps/send-message
mkdir -p plugins/my-integration/codegen
```

#### Step 2: Create Icon Component

**File:** `plugins/my-integration/icon.tsx`

```tsx
export function MyIntegrationIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-label="My Integration"
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

**OR** use a Lucide icon (skip this file entirely if using Lucide).

#### Step 3: Create Settings Component

**File:** `plugins/my-integration/settings.tsx`

This component is displayed when users configure your integration in settings:

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MyIntegrationSettings({
  apiKey,
  hasKey,
  onApiKeyChange,
  config,
  onConfigChange,
}: {
  apiKey: string;
  hasKey?: boolean;
  onApiKeyChange: (key: string) => void;
  showCard?: boolean;
  config?: Record<string, string>;
  onConfigChange?: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="myIntegrationApiKey">
          API Key
        </Label>
        <Input
          className="bg-background"
          id="myIntegrationApiKey"
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder={hasKey ? "API key is configured" : "Enter your API key"}
          type="password"
          value={apiKey}
        />
        <p className="text-muted-foreground text-sm">
          Get your API key from{" "}
          <a
            className="text-primary underline"
            href="https://my-integration.com/api-keys"
            rel="noopener noreferrer"
            target="_blank"
          >
            My Integration Dashboard
          </a>
          .
        </p>
      </div>
    </div>
  );
}
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

**File:** `plugins/my-integration/steps/send-message/step.ts`

This runs on the server during workflow execution:

```typescript
import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { getErrorMessage } from "@/lib/utils";

/**
 * Send Message Step
 * Sends a message using My Integration API
 */
export async function sendMessageStep(input: {
  integrationId?: string;
  message: string;
  channel: string;
}) {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

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
      id: result.id,
      url: result.url,
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to send message: ${getErrorMessage(error)}`,
    };
  }
}
```

#### Step 6: Create Config UI Component

**File:** `plugins/my-integration/steps/send-message/config.tsx`

This is the UI for configuring the action in the workflow builder:

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";

/**
 * Send Message Config Fields Component
 * UI for configuring the send message action
 */
export function SendMessageConfigFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: unknown) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="message"
          onChange={(value) => onUpdateConfig("message", value)}
          placeholder="Enter message or use {{NodeName.field}}"
          value={(config?.message as string) || ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="channel">Channel</Label>
        <Input
          disabled={disabled}
          id="channel"
          onChange={(e) => onUpdateConfig("channel", e.target.value)}
          placeholder="#general"
          value={(config?.channel as string) || ""}
        />
      </div>
    </>
  );
}
```

#### Step 7: Create Codegen Template

**File:** `plugins/my-integration/codegen/send-message.ts`

This template is used when users export/download their workflow as standalone code:

```typescript
/**
 * Code generation template for Send Message action
 * Used when exporting workflows to standalone Next.js projects
 */
export const sendMessageCodegenTemplate = `
export async function sendMessageStep(input: {
  message: string;
  channel: string;
}) {
  "use step";

  const apiKey = process.env.MY_INTEGRATION_API_KEY;

  if (!apiKey) {
    throw new Error('MY_INTEGRATION_API_KEY environment variable is required');
  }

  const response = await fetch('https://api.my-integration.com/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${apiKey}\`,
    },
    body: JSON.stringify({
      message: input.message,
      channel: input.channel,
    }),
  });

  if (!response.ok) {
    throw new Error(\`API request failed: \${response.statusText}\`);
  }

  const result = await response.json();

  return {
    id: result.id,
    url: result.url,
    success: true,
  };
}`;
```

#### Step 8: Create Plugin Index

**File:** `plugins/my-integration/index.tsx`

This ties everything together:

```tsx
import { MessageSquare } from "lucide-react";
import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { sendMessageCodegenTemplate } from "./codegen/send-message";
import { MyIntegrationIcon } from "./icon";
import { MyIntegrationSettings } from "./settings";
import { SendMessageConfigFields } from "./steps/send-message/config";
import { testMyIntegration } from "./test";

const myIntegrationPlugin: IntegrationPlugin = {
  type: "my-integration", // Must match type in lib/db/integrations.ts
  label: "My Integration",
  description: "Send messages and create records",

  icon: {
    type: "svg", // or "lucide" for Lucide icons
    value: "MyIntegrationIcon",
    svgComponent: MyIntegrationIcon,
  },
  // For Lucide icons, use:
  // icon: { type: "lucide", value: "MessageSquare" },

  settingsComponent: MyIntegrationSettings,

  formFields: [
    {
      id: "myIntegrationApiKey",
      label: "API Key",
      type: "password",
      placeholder: "sk_...",
      configKey: "myIntegrationApiKey",
      helpText: "Get your API key from ",
      helpLink: {
        text: "my-integration.com",
        url: "https://my-integration.com/api-keys",
      },
    },
  ],

  credentialMapping: (config) => {
    const creds: Record<string, string> = {};
    if (config.myIntegrationApiKey) {
      creds.MY_INTEGRATION_API_KEY = String(config.myIntegrationApiKey);
    }
    return creds;
  },

  testConfig: {
    testFunction: testMyIntegration,
  },

  actions: [
    {
      id: "Send Message",
      label: "Send Message",
      description: "Send a message to a channel",
      category: "My Integration",
      icon: MessageSquare,
      stepFunction: "sendMessageStep",
      stepImportPath: "send-message",
      configFields: SendMessageConfigFields,
      codegenTemplate: sendMessageCodegenTemplate,
    },
    // Add more actions as needed
  ],
};

// Auto-register on import
registerIntegration(myIntegrationPlugin);

export default myIntegrationPlugin;
```

#### Step 9: Add Integration Type to Database Schema

**Edit:** `lib/db/integrations.ts`

```typescript
export type IntegrationType =
  | "resend"
  | "linear"
  | "slack"
  | "database"
  | "ai-gateway"
  | "firecrawl"
  | "my-integration"; // Add this

export type IntegrationConfig = {
  // ... existing config
  myIntegrationApiKey?: string; // Add this
};
```

#### Step 10: Generate and Apply Migration

```bash
pnpm db:generate
pnpm db:push
```

#### Step 11: Test Your Integration

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
- Separate step/config files for each action
- Full TypeScript types

### Example 2: Using Lucide Icons

```typescript
// In index.tsx
import { Zap } from "lucide-react";

const plugin: IntegrationPlugin = {
  // ...
  icon: {
    type: "lucide",
    value: "Zap", // No icon.tsx file needed
  },
  // ...
};
```

### Example 3: Multiple Actions

```typescript
actions: [
  {
    id: "Send Message",
    label: "Send Message",
    description: "Send a message",
    category: "My Integration",
    icon: MessageSquare,
    stepFunction: "sendMessageStep",
    stepImportPath: "send-message",
    configFields: SendMessageConfigFields,
    codegenTemplate: sendMessageCodegenTemplate,
  },
  {
    id: "Create Record",
    label: "Create Record",
    description: "Create a new record",
    category: "My Integration",
    icon: Plus,
    stepFunction: "createRecordStep",
    stepImportPath: "create-record",
    configFields: CreateRecordConfigFields,
    codegenTemplate: createRecordCodegenTemplate,
  },
],
```

---

## Common Patterns

### Pattern 1: Template Badge Inputs

Use `TemplateBadgeInput` to allow users to reference outputs from other workflow nodes:

```tsx
<TemplateBadgeInput
  value={config?.message || ""}
  onChange={(value) => onUpdateConfig("message", value)}
  placeholder="Enter message or use {{NodeName.field}}"
/>
```

### Pattern 2: Step Function Error Handling

```typescript
try {
  const response = await fetch(/* ... */);
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  const result = await response.json();
  return { success: true, ...result };
} catch (error) {
  return {
    success: false,
    error: `Failed to execute: ${getErrorMessage(error)}`,
  };
}
```

### Pattern 3: Credential Mapping

```typescript
credentialMapping: (config) => {
  const creds: Record<string, string> = {};
  if (config.apiKey) {
    creds.MY_INTEGRATION_API_KEY = String(config.apiKey);
  }
  if (config.workspaceId) {
    creds.MY_INTEGRATION_WORKSPACE_ID = String(config.workspaceId);
  }
  return creds;
},
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

1. Create plugin directory with modular files (6-8 files)
2. Update database schema (add your type)
3. Run migration
4. Test thoroughly

Each integration is self-contained in one organized directory, making it easy to develop, test, and maintain. Happy building! 🚀

---

## Questions?

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and community support
- **Pull Requests**: For code contributions

Thank you for contributing to Workflow Builder! Your efforts help make this platform better for everyone. 💙
