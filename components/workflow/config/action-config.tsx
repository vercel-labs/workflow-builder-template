"use client";

import { useAtom } from "jotai";
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { CodeEditor } from "@/components/ui/code-editor";
import { IntegrationIcon } from "@/components/ui/integration-icon";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";
import { TemplateBadgeTextarea } from "@/components/ui/template-badge-textarea";
import {
  currentWorkflowIdAtom,
  currentWorkflowNameAtom,
} from "@/lib/workflow-store";
import { SchemaBuilder, type SchemaField } from "./schema-builder";

type ActionConfigProps = {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
};

// Send Email fields component
function SendEmailFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="emailTo">
          To (Email Address)
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="emailTo"
          onChange={(value) => onUpdateConfig("emailTo", value)}
          placeholder="user@example.com or {{NodeName.email}}"
          value={(config?.emailTo as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="emailSubject">
          Subject
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="emailSubject"
          onChange={(value) => onUpdateConfig("emailSubject", value)}
          placeholder="Subject or {{NodeName.title}}"
          value={(config?.emailSubject as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="emailBody">
          Body
        </Label>
        <TemplateBadgeTextarea
          disabled={disabled}
          id="emailBody"
          onChange={(value) => onUpdateConfig("emailBody", value)}
          placeholder="Email body. Use {{NodeName.field}} to insert data from previous nodes."
          rows={4}
          value={(config?.emailBody as string) || ""}
        />
      </div>
    </>
  );
}

// Send Slack Message fields component
function SendSlackMessageFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="slackChannel">
          Channel
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="slackChannel"
          onChange={(value) => onUpdateConfig("slackChannel", value)}
          placeholder="#general or @username or {{NodeName.channel}}"
          value={(config?.slackChannel as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="slackMessage">
          Message
        </Label>
        <TemplateBadgeTextarea
          disabled={disabled}
          id="slackMessage"
          onChange={(value) => onUpdateConfig("slackMessage", value)}
          placeholder="Your message. Use {{NodeName.field}} to insert data from previous nodes."
          rows={4}
          value={(config?.slackMessage as string) || ""}
        />
      </div>
    </>
  );
}

// Create Ticket fields component
function CreateTicketFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="ticketTitle">
          Ticket Title
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="ticketTitle"
          onChange={(value) => onUpdateConfig("ticketTitle", value)}
          placeholder="Bug report or {{NodeName.title}}"
          value={(config?.ticketTitle as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="ticketDescription">
          Description
        </Label>
        <TemplateBadgeTextarea
          disabled={disabled}
          id="ticketDescription"
          onChange={(value) => onUpdateConfig("ticketDescription", value)}
          placeholder="Description. Use {{NodeName.field}} to insert data from previous nodes."
          rows={4}
          value={(config?.ticketDescription as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="ticketPriority">
          Priority
        </Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("ticketPriority", value)}
          value={(config?.ticketPriority as string) || "2"}
        >
          <SelectTrigger className="w-full" id="ticketPriority">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">No Priority</SelectItem>
            <SelectItem value="1">Urgent</SelectItem>
            <SelectItem value="2">High</SelectItem>
            <SelectItem value="3">Medium</SelectItem>
            <SelectItem value="4">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

// Find Issues fields component
function FindIssuesFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="linearAssigneeId">
          Assignee (User ID)
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="linearAssigneeId"
          onChange={(value) => onUpdateConfig("linearAssigneeId", value)}
          placeholder="user-id-123 or {{NodeName.userId}}"
          value={(config?.linearAssigneeId as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="linearTeamId">
          Team ID (optional)
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="linearTeamId"
          onChange={(value) => onUpdateConfig("linearTeamId", value)}
          placeholder="team-id-456 or {{NodeName.teamId}}"
          value={(config?.linearTeamId as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="linearStatus">
          Status (optional)
        </Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("linearStatus", value)}
          value={(config?.linearStatus as string) || "any"}
        >
          <SelectTrigger className="w-full" id="linearStatus">
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="linearLabel">
          Label (optional)
        </Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="linearLabel"
          onChange={(value) => onUpdateConfig("linearLabel", value)}
          placeholder="bug, feature, etc. or {{NodeName.label}}"
          value={(config?.linearLabel as string) || ""}
        />
      </div>
    </>
  );
}

// Database Query fields component
function DatabaseQueryFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="dbQuery">SQL Query</Label>
        <div className="overflow-hidden rounded-md border">
          <CodeEditor
            defaultLanguage="sql"
            height="150px"
            onChange={(value) => onUpdateConfig("dbQuery", value || "")}
            options={{
              minimap: { enabled: false },
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              fontSize: 12,
              readOnly: disabled,
              wordWrap: "off",
            }}
            value={(config?.dbQuery as string) || ""}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          The DATABASE_URL from your project integrations will be used to
          execute this query.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Schema (Optional)</Label>
        <SchemaBuilder
          disabled={disabled}
          onChange={(schema) =>
            onUpdateConfig("dbSchema", JSON.stringify(schema))
          }
          schema={
            config?.dbSchema
              ? (JSON.parse(config.dbSchema as string) as SchemaField[])
              : []
          }
        />
      </div>
    </>
  );
}

// HTTP Request fields component
function HttpRequestFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="httpMethod">HTTP Method</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("httpMethod", value)}
          value={(config?.httpMethod as string) || "POST"}
        >
          <SelectTrigger className="w-full" id="httpMethod">
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="endpoint">URL</Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="endpoint"
          onChange={(value) => onUpdateConfig("endpoint", value)}
          placeholder="https://api.example.com/endpoint or {{NodeName.url}}"
          value={(config?.endpoint as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="httpHeaders">Headers (JSON)</Label>
        <div className="overflow-hidden rounded-md border">
          <CodeEditor
            defaultLanguage="json"
            height="100px"
            onChange={(value) => onUpdateConfig("httpHeaders", value || "{}")}
            options={{
              minimap: { enabled: false },
              lineNumbers: "off",
              scrollBeyondLastLine: false,
              fontSize: 12,
              readOnly: disabled,
              wordWrap: "off",
            }}
            value={(config?.httpHeaders as string) || "{}"}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="httpBody">Body (JSON)</Label>
        <div
          className={`overflow-hidden rounded-md border ${config?.httpMethod === "GET" ? "opacity-50" : ""}`}
        >
          <CodeEditor
            defaultLanguage="json"
            height="120px"
            onChange={(value) => onUpdateConfig("httpBody", value || "{}")}
            options={{
              minimap: { enabled: false },
              lineNumbers: "off",
              scrollBeyondLastLine: false,
              fontSize: 12,
              readOnly: config?.httpMethod === "GET" || disabled,
              domReadOnly: config?.httpMethod === "GET" || disabled,
              wordWrap: "off",
            }}
            value={(config?.httpBody as string) || "{}"}
          />
        </div>
        {config?.httpMethod === "GET" && (
          <p className="text-muted-foreground text-xs">
            Body is disabled for GET requests
          </p>
        )}
      </div>
    </>
  );
}

// Generate Text fields component
function GenerateTextFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="aiFormat">Format</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("aiFormat", value)}
          value={(config?.aiFormat as string) || "text"}
        >
          <SelectTrigger className="w-full" id="aiFormat">
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="object">Object</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="aiModel">Model</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("aiModel", value)}
          value={(config?.aiModel as string) || "gpt-5"}
        >
          <SelectTrigger className="w-full" id="aiModel">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gpt-5">GPT-5</SelectItem>
            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
            <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
            <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
            <SelectItem value="claude-3-5-sonnet-20241022">
              Claude 3.5 Sonnet
            </SelectItem>
            <SelectItem value="claude-3-5-haiku-20241022">
              Claude 3.5 Haiku
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="aiPrompt">Prompt</Label>
        <TemplateBadgeTextarea
          disabled={disabled}
          id="aiPrompt"
          onChange={(value) => onUpdateConfig("aiPrompt", value)}
          placeholder="Enter your prompt here. Use {{NodeName.field}} to reference previous outputs."
          rows={4}
          value={(config?.aiPrompt as string) || ""}
        />
      </div>
      {config?.aiFormat === "object" && (
        <div className="space-y-2">
          <Label>Schema</Label>
          <SchemaBuilder
            disabled={disabled}
            onChange={(schema) =>
              onUpdateConfig("aiSchema", JSON.stringify(schema))
            }
            schema={
              config?.aiSchema
                ? (JSON.parse(config.aiSchema as string) as SchemaField[])
                : []
            }
          />
        </div>
      )}
    </>
  );
}

// Generate Image fields component
function GenerateImageFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="imageModel">Model</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("imageModel", value)}
          value={(config?.imageModel as string) || "openai/dall-e-3"}
        >
          <SelectTrigger className="w-full" id="imageModel">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai/dall-e-3">OpenAI DALL-E 3</SelectItem>
            <SelectItem value="openai/dall-e-2">OpenAI DALL-E 2</SelectItem>
            <SelectItem value="google/gemini-2.5-flash-image">
              Google Gemini 2.5 Flash Image
            </SelectItem>
            <SelectItem value="google/gemini-2.5-flash-image-preview">
              Google Gemini 2.5 Flash Image Preview
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="imagePrompt">Prompt</Label>
        <TemplateBadgeTextarea
          disabled={disabled}
          id="imagePrompt"
          onChange={(value) => onUpdateConfig("imagePrompt", value)}
          placeholder="Describe the image you want to generate. Use {{NodeName.field}} to reference previous outputs."
          rows={4}
          value={(config?.imagePrompt as string) || ""}
        />
      </div>
    </>
  );
}

// Condition fields component
function ConditionFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="condition">Condition Expression</Label>
      <TemplateBadgeInput
        disabled={disabled}
        id="condition"
        onChange={(value) => onUpdateConfig("condition", value)}
        placeholder="e.g., 5 > 3, status === 200, {{PreviousNode.value}} > 100"
        value={(config?.condition as string) || ""}
      />
      <p className="text-muted-foreground text-xs">
        Enter a JavaScript expression that evaluates to true or false. You can
        use @ to reference previous node outputs.
      </p>
    </div>
  );
}

// Action categories and their actions
const ACTION_CATEGORIES = {
  System: ["HTTP Request", "Database Query", "Condition"],
  "AI Gateway": ["Generate Text", "Generate Image"],
  Linear: ["Create Ticket", "Find Issues"],
  Resend: ["Send Email"],
  Slack: ["Send Slack Message"],
} as const;

type ActionCategory = keyof typeof ACTION_CATEGORIES;

// Get category for an action type
const getCategoryForAction = (actionType: string): ActionCategory | null => {
  for (const [category, actions] of Object.entries(ACTION_CATEGORIES)) {
    if (actions.includes(actionType as never)) {
      return category as ActionCategory;
    }
  }
  return null;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Component inherently complex due to multiple action types
export function ActionConfig({
  config,
  onUpdateConfig,
  disabled,
}: ActionConfigProps) {
  const [_workflowId] = useAtom(currentWorkflowIdAtom);
  const [_workflowName] = useAtom(currentWorkflowNameAtom);

  const actionType = (config?.actionType as string) || "";
  const selectedCategory = actionType ? getCategoryForAction(actionType) : null;
  const [category, setCategory] = useState<ActionCategory | "">(
    selectedCategory || ""
  );

  // Sync category state when actionType changes (e.g., when switching nodes)
  useEffect(() => {
    const newCategory = actionType ? getCategoryForAction(actionType) : null;
    setCategory(newCategory || "");
  }, [actionType]);

  const handleCategoryChange = (newCategory: ActionCategory) => {
    setCategory(newCategory);
    // Auto-select the first action in the new category
    const firstAction = ACTION_CATEGORIES[newCategory][0];
    onUpdateConfig("actionType", firstAction);
  };

  const handleActionTypeChange = (value: string) => {
    onUpdateConfig("actionType", value);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="ml-1" htmlFor="actionCategory">
            Category
          </Label>
          <Select
            disabled={disabled}
            onValueChange={(value) =>
              handleCategoryChange(value as ActionCategory)
            }
            value={category || undefined}
          >
            <SelectTrigger className="w-full" id="actionCategory">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="System">
                <div className="flex items-center gap-2">
                  <Settings className="size-4" />
                  <span>System</span>
                </div>
              </SelectItem>
              <SelectItem value="AI Gateway">
                <div className="flex items-center gap-2">
                  <IntegrationIcon className="size-4" integration="vercel" />
                  <span>AI Gateway</span>
                </div>
              </SelectItem>
              <SelectItem value="Linear">
                <div className="flex items-center gap-2">
                  <IntegrationIcon className="size-4" integration="linear" />
                  <span>Linear</span>
                </div>
              </SelectItem>
              <SelectItem value="Resend">
                <div className="flex items-center gap-2">
                  <IntegrationIcon className="size-4" integration="resend" />
                  <span>Resend</span>
                </div>
              </SelectItem>
              <SelectItem value="Slack">
                <div className="flex items-center gap-2">
                  <IntegrationIcon className="size-4" integration="slack" />
                  <span>Slack</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="ml-1" htmlFor="actionType">
            Action
          </Label>
          <Select
            disabled={disabled || !category}
            onValueChange={handleActionTypeChange}
            value={actionType || undefined}
          >
            <SelectTrigger className="w-full" id="actionType">
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              {category &&
                ACTION_CATEGORIES[category].map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Send Email fields */}
      {config?.actionType === "Send Email" && (
        <SendEmailFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {/* Send Slack Message fields */}
      {config?.actionType === "Send Slack Message" && (
        <SendSlackMessageFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {/* Create Ticket fields */}
      {config?.actionType === "Create Ticket" && (
        <CreateTicketFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {/* Find Issues fields */}
      {config?.actionType === "Find Issues" && (
        <FindIssuesFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {/* Database Query fields */}
      {config?.actionType === "Database Query" && (
        <DatabaseQueryFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {/* HTTP Request fields */}
      {config?.actionType === "HTTP Request" && (
        <HttpRequestFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {/* Generate Text fields */}
      {config?.actionType === "Generate Text" && (
        <GenerateTextFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {/* Generate Image fields */}
      {config?.actionType === "Generate Image" && (
        <GenerateImageFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {/* Condition fields */}
      {config?.actionType === "Condition" && (
        <ConditionFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}
    </>
  );
}
