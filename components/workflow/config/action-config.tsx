"use client";

import Editor from "@monaco-editor/react";
import { useAtom } from "jotai";
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { getAll as getAllDataSources } from "@/app/actions/data-source/get-all";
import { ProjectIntegrationsDialog } from "@/components/settings/project-integrations-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
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
  };

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

  const actionType = (config?.actionType as string) || "HTTP Request";
  const requiredIntegration = ACTION_INTEGRATION_MAP[actionType];

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="actionType">Action Type</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("actionType", value)}
          value={actionType}
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
              <SelectItem value="Execute Code">Execute Code</SelectItem>
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
                <Settings className="h-3 w-3" />
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
      )}

      {/* Send Slack Message fields */}
      {config?.actionType === "Send Slack Message" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="slackChannel">Channel</Label>
            <Input
              disabled={disabled}
              id="slackChannel"
              onChange={(e) => onUpdateConfig("slackChannel", e.target.value)}
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
      )}

      {/* Create Ticket fields */}
      {config?.actionType === "Create Ticket" && (
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
      )}

      {/* Find Issues fields */}
      {config?.actionType === "Find Issues" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="linearAssigneeId">Assignee (User ID)</Label>
            <Input
              disabled={disabled}
              id="linearAssigneeId"
              onChange={(e) =>
                onUpdateConfig("linearAssigneeId", e.target.value)
              }
              placeholder="user-id-123"
              value={(config?.linearAssigneeId as string) || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linearTeamId">Team ID (optional)</Label>
            <Input
              disabled={disabled}
              id="linearTeamId"
              onChange={(e) => onUpdateConfig("linearTeamId", e.target.value)}
              placeholder="team-id-456"
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
            <Input
              disabled={disabled}
              id="linearLabel"
              onChange={(e) => onUpdateConfig("linearLabel", e.target.value)}
              placeholder="bug, feature, etc."
              value={(config?.linearLabel as string) || ""}
            />
          </div>
        </>
      )}

      {/* Database Query fields */}
      {config?.actionType === "Database Query" && (
        <>
          {loadingDataSources ? (
            <div className="space-y-2">
              <Label>Loading data sources...</Label>
            </div>
          ) : dataSources.length === 0 ? (
            <Alert>
              <AlertDescription>
                No data sources configured. Please add a data source in Settings
                to query databases.
              </AlertDescription>
            </Alert>
          ) : (
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
          )}
          <div className="space-y-2">
            <Label htmlFor="dbQuery">SQL Query</Label>
            <div className="overflow-hidden rounded-md border">
              <Editor
                defaultLanguage="sql"
                height="150px"
                onChange={(value) => onUpdateConfig("dbQuery", value || "")}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  fontSize: 12,
                  readOnly: disabled,
                }}
                theme="vs-dark"
                value={(config?.dbQuery as string) || ""}
              />
            </div>
          </div>
        </>
      )}

      {/* HTTP Request fields */}
      {config?.actionType === "HTTP Request" && (
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
            <Input
              disabled={disabled}
              id="endpoint"
              onChange={(e) => onUpdateConfig("endpoint", e.target.value)}
              placeholder="https://api.example.com/endpoint"
              value={(config?.endpoint as string) || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="httpHeaders">Headers (JSON)</Label>
            <div className="overflow-hidden rounded-md border">
              <Editor
                defaultLanguage="json"
                height="100px"
                onChange={(value) =>
                  onUpdateConfig("httpHeaders", value || "{}")
                }
                options={{
                  minimap: { enabled: false },
                  lineNumbers: "off",
                  scrollBeyondLastLine: false,
                  fontSize: 12,
                  readOnly: disabled,
                }}
                theme="vs-dark"
                value={(config?.httpHeaders as string) || "{}"}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="httpBody">Body (JSON)</Label>
            <div
              className={`overflow-hidden rounded-md border ${config?.httpMethod === "GET" ? "opacity-50" : ""}`}
            >
              <Editor
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
                }}
                theme="vs-dark"
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
      )}

      {/* Generate Text fields */}
      {config?.actionType === "Generate Text" && (
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
      )}

      {/* Generate Image fields */}
      {config?.actionType === "Generate Image" && (
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
      )}

      {/* Execute Code fields */}
      {config?.actionType === "Execute Code" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="codeLanguage">Language</Label>
            <Select
              disabled={disabled}
              onValueChange={(value) => onUpdateConfig("codeLanguage", value)}
              value={(config?.codeLanguage as string) || "javascript"}
            >
              <SelectTrigger className="w-full" id="codeLanguage">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="typescript">TypeScript</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <div className="overflow-hidden rounded-md border">
              <Editor
                defaultLanguage={
                  (config?.codeLanguage as string) || "javascript"
                }
                height="300px"
                onChange={(value) => onUpdateConfig("code", value || "")}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  fontSize: 12,
                  readOnly: disabled,
                }}
                theme="vs-dark"
                value={(config?.code as string) || ""}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Write your code here. Access previous node outputs using the{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                outputs
              </code>{" "}
              object (e.g.,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                outputs.NodeName
              </code>
              ). Return a value to use it in subsequent nodes.
            </p>
          </div>
        </>
      )}
    </>
  );
}
