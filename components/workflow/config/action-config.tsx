"use client";

import Editor from "@monaco-editor/react";
import { Settings } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { SchemaBuilder, type SchemaField } from "./schema-builder";

interface ActionConfigProps {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}

export function ActionConfig({
  config,
  onUpdateConfig,
  disabled,
}: ActionConfigProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="actionType">Action Type</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("actionType", value)}
          value={(config?.actionType as string) || "HTTP Request"}
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
      </div>

      {/* Send Email fields */}
      {config?.actionType === "Send Email" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="emailTo">To (Email Address)</Label>
            <Input
              disabled={disabled}
              id="emailTo"
              onChange={(e) => onUpdateConfig("emailTo", e.target.value)}
              placeholder="user@example.com or {{NodeName.email}}"
              value={(config?.emailTo as string) || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailSubject">Subject</Label>
            <Input
              disabled={disabled}
              id="emailSubject"
              onChange={(e) => onUpdateConfig("emailSubject", e.target.value)}
              placeholder="Subject or {{NodeName.title}}"
              value={(config?.emailSubject as string) || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailBody">Body</Label>
            <Textarea
              disabled={disabled}
              id="emailBody"
              onChange={(e) => onUpdateConfig("emailBody", e.target.value)}
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
            <Textarea
              disabled={disabled}
              id="slackMessage"
              onChange={(e) => onUpdateConfig("slackMessage", e.target.value)}
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
            <Input
              disabled={disabled}
              id="ticketTitle"
              onChange={(e) => onUpdateConfig("ticketTitle", e.target.value)}
              placeholder="Bug report or {{NodeName.title}}"
              value={(config?.ticketTitle as string) || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticketDescription">Description</Label>
            <Textarea
              disabled={disabled}
              id="ticketDescription"
              onChange={(e) =>
                onUpdateConfig("ticketDescription", e.target.value)
              }
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
          <div className="space-y-2">
            <Label htmlFor="dbTable">Table Name (optional)</Label>
            <Input
              disabled={disabled}
              id="dbTable"
              onChange={(e) => onUpdateConfig("dbTable", e.target.value)}
              placeholder="users"
              value={(config?.dbTable as string) || ""}
            />
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
            <div className="overflow-hidden rounded-md border">
              <Editor
                defaultLanguage="json"
                height="120px"
                onChange={(value) => onUpdateConfig("httpBody", value || "{}")}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: "off",
                  scrollBeyondLastLine: false,
                  fontSize: 12,
                  readOnly: disabled,
                }}
                theme="vs-dark"
                value={(config?.httpBody as string) || "{}"}
              />
            </div>
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
            <Textarea
              disabled={disabled}
              id="aiPrompt"
              onChange={(e) => onUpdateConfig("aiPrompt", e.target.value)}
              placeholder="Enter your prompt here. Use {{$nodeId.field}} to reference previous outputs."
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
            <Textarea
              disabled={disabled}
              id="imagePrompt"
              onChange={(e) => onUpdateConfig("imagePrompt", e.target.value)}
              placeholder="Describe the image you want to generate. Use {{$nodeId.field}} to reference previous outputs."
              rows={4}
              value={(config?.imagePrompt as string) || ""}
            />
          </div>
        </>
      )}
    </>
  );
}
