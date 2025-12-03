# Plugin Development Guide for AI Agents

This document guides AI agents through creating and modifying workflow builder plugins.

## Quick Start

Use the interactive plugin creation wizard:

```bash
pnpm create-plugin
```

After creating or modifying a plugin, regenerate registries:

```bash
pnpm discover-plugins
```

## Plugin Architecture

Each plugin lives in `plugins/[plugin-name]/` with this structure:

```
plugins/[plugin-name]/
  index.ts          # Plugin definition (actions, form fields, metadata)
  credentials.ts    # Credential type definition
  icon.tsx          # SVG icon component
  test.ts           # Connection test function
  steps/
    [action].ts     # Server-side step functions (one per action)
```

## Creating a Plugin

### 1. Plugin Definition (index.ts)

The main plugin file registers the integration and defines its actions:

```typescript
import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { MyServiceIcon } from "./icon";

const myServicePlugin: IntegrationPlugin = {
  // Must match folder name and be unique
  type: "my-service",

  // Display name and description
  label: "My Service",
  description: "Brief description of what this integration does",

  // Icon component
  icon: MyServiceIcon,

  // Credential form fields shown in the integration dialog
  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",        // "password" | "text" | "url"
      placeholder: "sk_...",
      configKey: "apiKey",     // Key stored in database
      envVar: "MY_SERVICE_API_KEY",  // Environment variable name
      helpText: "Get your API key from ",
      helpLink: {
        text: "myservice.com/api-keys",
        url: "https://myservice.com/api-keys",
      },
    },
  ],

  // Lazy-loaded test function
  testConfig: {
    getTestFunction: async () => {
      const { testMyService } = await import("./test");
      return testMyService;
    },
  },

  // Actions provided by this integration
  actions: [
    {
      slug: "do-something",
      label: "Do Something",
      description: "Description of what this action does",
      category: "My Service",
      stepFunction: "doSomethingStep",
      stepImportPath: "do-something",
      configFields: [
        {
          key: "inputField",
          label: "Input Field",
          type: "template-input",  // Supports {{NodeName.field}} syntax
          placeholder: "Enter value or use {{NodeName.field}}",
          example: "example value",
          required: true,
        },
      ],
    },
  ],
};

registerIntegration(myServicePlugin);
export default myServicePlugin;
```

### 2. Credentials Type (credentials.ts)

Define the credential fields using environment variable names as keys:

```typescript
export type MyServiceCredentials = {
  MY_SERVICE_API_KEY?: string;
  // Add other credential fields as needed
};
```

### 3. Step Function (steps/[action].ts)

Step functions follow a two-layer pattern:

```typescript
import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { MyServiceCredentials } from "../credentials";

// Result type - use discriminated union
type DoSomethingResult =
  | { success: true; id: string }
  | { success: false; error: string };

// Core input - fields from configFields
export type DoSomethingCoreInput = {
  inputField: string;
  optionalField?: string;
};

// Full input - includes integrationId and step context
export type DoSomethingInput = StepInput &
  DoSomethingCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - receives credentials as parameter
 * This separation allows the logic to be reused in code export
 */
async function stepHandler(
  input: DoSomethingCoreInput,
  credentials: MyServiceCredentials
): Promise<DoSomethingResult> {
  const apiKey = credentials.MY_SERVICE_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "MY_SERVICE_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  try {
    // Use fetch directly - no SDK dependencies
    const response = await fetch("https://api.myservice.com/endpoint", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        field: input.inputField,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, id: data.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed: ${message}` };
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function doSomethingStep(
  input: DoSomethingInput
): Promise<DoSomethingResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

// Required for codegen auto-generation
export const _integrationType = "my-service";
```

### 4. Test Function (test.ts)

Validates credentials when users click "Test Connection":

```typescript
export async function testMyService(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.MY_SERVICE_API_KEY;

    if (!apiKey) {
      return { success: false, error: "MY_SERVICE_API_KEY is required" };
    }

    // Option 1: Format validation (if API keys have known format)
    if (!apiKey.startsWith("sk_")) {
      return {
        success: false,
        error: "Invalid API key format. Keys should start with 'sk_'",
      };
    }

    // Option 2: Make a lightweight read-only API call
    const response = await fetch("https://api.myservice.com/v1/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: "Invalid API key" };
      }
      return { success: false, error: `API error: HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
```

### 5. Icon Component (icon.tsx)

Create an SVG icon component:

```typescript
export function MyServiceIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-label="My Service logo"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>My Service</title>
      {/* Get SVG path from https://simpleicons.org */}
      <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z" />
    </svg>
  );
}
```

Alternatively, use a Lucide icon directly in index.ts:

```typescript
import { Mail } from "lucide-react";

const plugin: IntegrationPlugin = {
  icon: Mail,
  // ...
};
```

## Config Field Types

Available types for action `configFields`:

| Type | Description | Supports Variables |
|------|-------------|-------------------|
| `template-input` | Single-line input with `{{NodeName.field}}` support | Yes |
| `template-textarea` | Multi-line textarea with variable support | Yes |
| `text` | Plain text input | No |
| `number` | Numeric input | No |
| `select` | Dropdown with predefined options | No |
| `schema-builder` | Structured output schema builder | No |
| `group` | Groups related fields in collapsible section | N/A |

### Select Field Example

```typescript
{
  key: "priority",
  label: "Priority",
  type: "select",
  options: [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ],
  defaultValue: "medium",
}
```

### Conditional Field Example

```typescript
{
  key: "webhookUrl",
  label: "Webhook URL",
  type: "template-input",
  showWhen: { field: "notifyType", equals: "webhook" },
}
```

### Field Group Example

```typescript
{
  type: "group",
  label: "Advanced Options",
  defaultExpanded: false,
  fields: [
    { key: "timeout", label: "Timeout (ms)", type: "number", min: 0 },
    { key: "retries", label: "Retry Count", type: "number", min: 0 },
  ],
}
```

## Critical Rules

### Use fetch, Not SDKs

Plugins must use the native `fetch` API instead of SDK dependencies:

```typescript
// CORRECT - use fetch directly
const response = await fetch("https://api.service.com/endpoint", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify(data),
});

// WRONG - do not add SDK dependencies
import { ServiceClient } from "service-sdk";  // Never do this
const client = new ServiceClient(apiKey);
```

This reduces supply chain attack surface by avoiding transitive dependencies.

### Naming Conventions

- Plugin folder name = plugin `type` (kebab-case): `my-service`
- Step function name = `[actionName]Step` (camelCase): `doSomethingStep`
- Step import path = action slug (kebab-case): `do-something`
- Credential type = `[PluginName]Credentials` (PascalCase): `MyServiceCredentials`
- Test function = `test[PluginName]` (camelCase): `testMyService`
- Icon component = `[PluginName]Icon` (PascalCase): `MyServiceIcon`
- Env vars = `[PLUGIN_NAME]_[FIELD]` (SCREAMING_SNAKE_CASE): `MY_SERVICE_API_KEY`

### Step Function Requirements

1. Must include `"use step";` directive at the start of the entry point function
2. Must import `"server-only"` at the top of the file
3. Must export `_integrationType` constant matching the plugin type
4. Core input type should match the configFields keys
5. Full input type extends `StepInput` and includes `integrationId`

### Result Types

Use discriminated unions for result types:

```typescript
type ActionResult =
  | { success: true; id: string; data?: SomeData }
  | { success: false; error: string };
```

## Testing Your Plugin

After creating a plugin:

1. Run `pnpm discover-plugins` to register it
2. Run `pnpm type-check && pnpm fix` to verify types and fix formatting/linting
3. Run `pnpm dev` to test in the UI
4. Test the connection using the integration dialog
5. Create a workflow using your action
6. Execute the workflow to verify it works

## Submitting Your Plugin

Once your plugin is tested and working, create a PR:

**Title:** `feat: add [Plugin Name] plugin`

**Body:**
```
## Summary
Adds [Plugin Name] plugin with the following actions:
- [Action 1]: [Brief description]
- [Action 2]: [Brief description]

## Test plan
- [ ] Connection test validates credentials
- [ ] Actions execute successfully in a workflow
- [ ] Error handling works for invalid inputs
```

## Common Patterns

### Multiple Actions

Add multiple actions in the `actions` array:

```typescript
actions: [
  {
    slug: "create-item",
    label: "Create Item",
    // ...
  },
  {
    slug: "update-item",
    label: "Update Item",
    // ...
  },
  {
    slug: "delete-item",
    label: "Delete Item",
    // ...
  },
],
```

Each action needs its own step file in the `steps/` directory.

### Optional Credentials

Some plugins may work without credentials (using defaults or public APIs):

```typescript
const credentials = input.integrationId
  ? await fetchCredentials(input.integrationId)
  : {};  // Empty object if no integrationId

// Handle missing credentials gracefully
const apiKey = credentials.API_KEY || process.env.DEFAULT_API_KEY;
```

### Error Handling

Always return structured errors, never throw:

```typescript
try {
  // API call
} catch (error) {
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error),
  };
}
```

## Reference Plugins

Study these existing plugins for patterns:

- `resend/` - Email sending with multiple fields
- `slack/` - Webhook integration
- `linear/` - Issue tracking with select fields
- `ai-gateway/` - AI model integration with schema builder
