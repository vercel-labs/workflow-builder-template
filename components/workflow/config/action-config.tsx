"use client";

import { useAtom } from "jotai";
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { getAll as getAllDataSources } from "@/app/actions/data-source/get-all";
import { ProjectIntegrationsDialog } from "@/components/settings/project-integrations-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CodeEditor } from "@/components/ui/code-editor";
import { IntegrationIcon } from "@/components/ui/integration-icon";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";
import { TemplateBadgeTextarea } from "@/components/ui/template-badge-textarea";
import {
  currentVercelProjectIdAtom,
  currentVercelProjectNameAtom,
} from "@/lib/workflow-store";
import { SchemaBuilder, type SchemaField } from "./schema-builder";

type ActionConfigProps = {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
};

type DataSource = {
  id: string;
  name: string;
  type: string;
  connectionString: string;
  isDefault: boolean;
};

// Map action types to their required integrations
const ACTION_INTEGRATION_MAP: Record<string, { name: string; label: string }> =
  {
    "Send Email": { name: "resend", label: "Resend" },
    "Send Slack Message": { name: "slack", label: "Slack" },
    "Create Ticket": { name: "linear", label: "Linear" },
    "Find Issues": { name: "linear", label: "Linear" },
    "Generate Text": { name: "ai-gateway", label: "AI Gateway" },
    "Generate Image": { name: "ai-gateway", label: "AI Gateway" },
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
        <Label htmlFor="emailTo">To (Email Address)</Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="emailTo"
          onChange={(value) => onUpdateConfig("emailTo", value)}
          placeholder="user@example.com or {{NodeName.email}}"
          value={(config?.emailTo as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emailSubject">Subject</Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="emailSubject"
          onChange={(value) => onUpdateConfig("emailSubject", value)}
          placeholder="Subject or {{NodeName.title}}"
          value={(config?.emailSubject as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emailBody">Body</Label>
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
        <Label htmlFor="slackChannel">Channel</Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="slackChannel"
          onChange={(value) => onUpdateConfig("slackChannel", value)}
          placeholder="#general or @username or {{NodeName.channel}}"
          value={(config?.slackChannel as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slackMessage">Message</Label>
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
        <Label htmlFor="ticketTitle">Ticket Title</Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="ticketTitle"
          onChange={(value) => onUpdateConfig("ticketTitle", value)}
          placeholder="Bug report or {{NodeName.title}}"
          value={(config?.ticketTitle as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ticketDescription">Description</Label>
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
        <Label htmlFor="ticketPriority">Priority</Label>
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
        <Label htmlFor="linearAssigneeId">Assignee (User ID)</Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="linearAssigneeId"
          onChange={(value) => onUpdateConfig("linearAssigneeId", value)}
          placeholder="user-id-123 or {{NodeName.userId}}"
          value={(config?.linearAssigneeId as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="linearTeamId">Team ID (optional)</Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="linearTeamId"
          onChange={(value) => onUpdateConfig("linearTeamId", value)}
          placeholder="team-id-456 or {{NodeName.teamId}}"
          value={(config?.linearTeamId as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="linearStatus">Status (optional)</Label>
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
        <Label htmlFor="linearLabel">Label (optional)</Label>
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
  dataSources,
  loadingDataSources,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
  dataSources: DataSource[];
  loadingDataSources: boolean;
}) {
  const renderDataSourceSelector = () => {
    if (loadingDataSources) {
      return (
        <div className="space-y-2">
          <Label>Loading data sources...</Label>
        </div>
      );
    }
    if (dataSources.length === 0) {
      return (
        <Alert>
          <AlertDescription>
            No data sources configured. Please add a data source in Settings to
            query databases.
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <div className="space-y-2">
        <Label htmlFor="dataSourceId">Data Source</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("dataSourceId", value)}
          value={(config?.dataSourceId as string) || ""}
        >
          <SelectTrigger className="w-full" id="dataSourceId">
            <SelectValue placeholder="Select a data source" />
          </SelectTrigger>
          <SelectContent>
            {dataSources.map((source) => (
              <SelectItem key={source.id} value={source.id}>
                {source.name} {source.isDefault && "(Default)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <>
      {renderDataSourceSelector()}
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
          value={(config?.aiModel as string) || "gpt-4o-mini"}
        >
          <SelectTrigger className="w-full" id="aiModel">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
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

export function ActionConfig({
  config,
  onUpdateConfig,
  disabled,
}: ActionConfigProps) {
  const [showIntegrationsDialog, setShowIntegrationsDialog] = useState(false);
  const [projectId] = useAtom(currentVercelProjectIdAtom);
  const [projectName] = useAtom(currentVercelProjectNameAtom);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loadingDataSources, setLoadingDataSources] = useState(false);

  // Load data sources when the component mounts or when actionType is Database Query
  useEffect(() => {
    if (config?.actionType === "Database Query") {
      setLoadingDataSources(true);
      getAllDataSources()
        .then((sources) => {
          setDataSources(sources as DataSource[]);
        })
        .catch((err) => {
          console.error("Failed to load data sources:", err);
        })
        .finally(() => {
          setLoadingDataSources(false);
        });
    }
  }, [config?.actionType]);

  const actionType = (config?.actionType as string) || "";
  const requiredIntegration = ACTION_INTEGRATION_MAP[actionType];

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="actionType">Action Type</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("actionType", value)}
          value={actionType || undefined}
        >
          <SelectTrigger className="w-full" id="actionType">
            <SelectValue placeholder="Select action type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel className="flex items-center gap-2">
                <Settings className="h-3 w-3" />
                System
              </SelectLabel>
              <SelectItem value="HTTP Request">HTTP Request</SelectItem>
              <SelectItem value="Database Query">Database Query</SelectItem>
              <SelectItem value="Condition">Condition</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="flex items-center gap-2">
                <IntegrationIcon integration="resend" />
                Resend
              </SelectLabel>
              <SelectItem value="Send Email">Send Email</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="flex items-center gap-2">
                <IntegrationIcon integration="slack" />
                Slack
              </SelectLabel>
              <SelectItem value="Send Slack Message">
                Send Slack Message
              </SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="flex items-center gap-2">
                <IntegrationIcon integration="linear" />
                Linear
              </SelectLabel>
              <SelectItem value="Create Ticket">Create Ticket</SelectItem>
              <SelectItem value="Find Issues">Find Issues</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="flex items-center gap-2">
                <IntegrationIcon integration="vercel" />
                AI Gateway
              </SelectLabel>
              <SelectItem value="Generate Text">Generate Text</SelectItem>
              <SelectItem value="Generate Image">Generate Image</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        {requiredIntegration && (
          <p className="text-muted-foreground text-xs">
            This action requires{" "}
            <button
              className="text-foreground underline hover:text-foreground/80"
              onClick={() => setShowIntegrationsDialog(true)}
              type="button"
            >
              {requiredIntegration.label} integration
            </button>
            .
          </p>
        )}
      </div>

      <ProjectIntegrationsDialog
        onOpenChange={setShowIntegrationsDialog}
        open={showIntegrationsDialog}
        projectId={projectId}
        projectName={projectName}
      />

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
          dataSources={dataSources}
          disabled={disabled}
          loadingDataSources={loadingDataSources}
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
