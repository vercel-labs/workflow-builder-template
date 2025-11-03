'use client';

import { Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IntegrationIcon } from '@/components/ui/integration-icon';
import Editor from '@monaco-editor/react';

interface ActionConfigProps {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}

export function ActionConfig({ config, onUpdateConfig, disabled }: ActionConfigProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="actionType" className="text-xs">
          Action Type
        </Label>
        <Select
          value={(config?.actionType as string) || 'HTTP Request'}
          onValueChange={(value) => onUpdateConfig('actionType', value)}
          disabled={disabled}
        >
          <SelectTrigger id="actionType">
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
                <IntegrationIcon integration="ai-gateway" />
                AI Gateway
              </SelectLabel>
              <SelectItem value="Generate Text">Generate Text</SelectItem>
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
              <SelectItem value="Send Slack Message">Send Slack Message</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="flex items-center gap-2">
                <IntegrationIcon integration="linear" />
                Linear
              </SelectLabel>
              <SelectItem value="Create Ticket">Create Ticket</SelectItem>
              <SelectItem value="Find Issues">Find Issues</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Generate Text fields */}
      {config?.actionType === 'Generate Text' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="aiModel" className="text-xs">
              Model
            </Label>
            <Select
              value={(config?.aiModel as string) || 'gpt-3.5-turbo'}
              onValueChange={(value) => onUpdateConfig('aiModel', value)}
              disabled={disabled}
            >
              <SelectTrigger id="aiModel">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                <SelectItem value="llama-3-70b">Llama 3 70B</SelectItem>
                <SelectItem value="mistral-large">Mistral Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="aiPrompt" className="text-xs">
              Prompt
            </Label>
            <Textarea
              id="aiPrompt"
              value={(config?.aiPrompt as string) || ''}
              onChange={(e) => onUpdateConfig('aiPrompt', e.target.value)}
              placeholder="Enter your prompt. Use {{NodeName.field}} to insert data from previous nodes."
              disabled={disabled}
              rows={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aiMaxTokens" className="text-xs">
              Max Tokens (optional)
            </Label>
            <Input
              id="aiMaxTokens"
              type="number"
              value={(config?.aiMaxTokens as string) || '1000'}
              onChange={(e) => onUpdateConfig('aiMaxTokens', e.target.value)}
              placeholder="1000"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aiTemperature" className="text-xs">
              Temperature (optional)
            </Label>
            <Input
              id="aiTemperature"
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={(config?.aiTemperature as string) || '0.7'}
              onChange={(e) => onUpdateConfig('aiTemperature', e.target.value)}
              placeholder="0.7"
              disabled={disabled}
            />
          </div>
        </>
      )}

      {/* Send Email fields */}
      {config?.actionType === 'Send Email' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="emailTo" className="text-xs">
              To (Email Address)
            </Label>
            <Input
              id="emailTo"
              value={(config?.emailTo as string) || ''}
              onChange={(e) => onUpdateConfig('emailTo', e.target.value)}
              placeholder="user@example.com or {{NodeName.email}}"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailSubject" className="text-xs">
              Subject
            </Label>
            <Input
              id="emailSubject"
              value={(config?.emailSubject as string) || ''}
              onChange={(e) => onUpdateConfig('emailSubject', e.target.value)}
              placeholder="Subject or {{NodeName.title}}"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailBody" className="text-xs">
              Body
            </Label>
            <Textarea
              id="emailBody"
              value={(config?.emailBody as string) || ''}
              onChange={(e) => onUpdateConfig('emailBody', e.target.value)}
              placeholder="Email body. Use {{NodeName.field}} to insert data from previous nodes."
              disabled={disabled}
              rows={4}
            />
          </div>
        </>
      )}

      {/* Send Slack Message fields */}
      {config?.actionType === 'Send Slack Message' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="slackChannel" className="text-xs">
              Channel
            </Label>
            <Input
              id="slackChannel"
              value={(config?.slackChannel as string) || ''}
              onChange={(e) => onUpdateConfig('slackChannel', e.target.value)}
              placeholder="#general or @username or {{NodeName.channel}}"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slackMessage" className="text-xs">
              Message
            </Label>
            <Textarea
              id="slackMessage"
              value={(config?.slackMessage as string) || ''}
              onChange={(e) => onUpdateConfig('slackMessage', e.target.value)}
              placeholder="Your message. Use {{NodeName.field}} to insert data from previous nodes."
              disabled={disabled}
              rows={4}
            />
          </div>
        </>
      )}

      {/* Create Ticket fields */}
      {config?.actionType === 'Create Ticket' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="ticketTitle" className="text-xs">
              Ticket Title
            </Label>
            <Input
              id="ticketTitle"
              value={(config?.ticketTitle as string) || ''}
              onChange={(e) => onUpdateConfig('ticketTitle', e.target.value)}
              placeholder="Bug report or {{NodeName.title}}"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticketDescription" className="text-xs">
              Description
            </Label>
            <Textarea
              id="ticketDescription"
              value={(config?.ticketDescription as string) || ''}
              onChange={(e) => onUpdateConfig('ticketDescription', e.target.value)}
              placeholder="Description. Use {{NodeName.field}} to insert data from previous nodes."
              disabled={disabled}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticketPriority" className="text-xs">
              Priority
            </Label>
            <Select
              value={(config?.ticketPriority as string) || '2'}
              onValueChange={(value) => onUpdateConfig('ticketPriority', value)}
              disabled={disabled}
            >
              <SelectTrigger id="ticketPriority">
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
      {config?.actionType === 'Find Issues' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="linearAssigneeId" className="text-xs">
              Assignee (User ID)
            </Label>
            <Input
              id="linearAssigneeId"
              value={(config?.linearAssigneeId as string) || ''}
              onChange={(e) => onUpdateConfig('linearAssigneeId', e.target.value)}
              placeholder="user-id-123"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linearTeamId" className="text-xs">
              Team ID (optional)
            </Label>
            <Input
              id="linearTeamId"
              value={(config?.linearTeamId as string) || ''}
              onChange={(e) => onUpdateConfig('linearTeamId', e.target.value)}
              placeholder="team-id-456"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linearStatus" className="text-xs">
              Status (optional)
            </Label>
            <Select
              value={(config?.linearStatus as string) || 'any'}
              onValueChange={(value) => onUpdateConfig('linearStatus', value)}
              disabled={disabled}
            >
              <SelectTrigger id="linearStatus">
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
            <Label htmlFor="linearLabel" className="text-xs">
              Label (optional)
            </Label>
            <Input
              id="linearLabel"
              value={(config?.linearLabel as string) || ''}
              onChange={(e) => onUpdateConfig('linearLabel', e.target.value)}
              placeholder="bug, feature, etc."
              disabled={disabled}
            />
          </div>
        </>
      )}

      {/* Database Query fields */}
      {config?.actionType === 'Database Query' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="dbQuery" className="text-xs">
              SQL Query
            </Label>
            <div className="overflow-hidden rounded-md border">
              <Editor
                height="150px"
                defaultLanguage="sql"
                value={(config?.dbQuery as string) || ''}
                onChange={(value) => onUpdateConfig('dbQuery', value || '')}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  fontSize: 12,
                  readOnly: disabled,
                }}
                theme="vs-dark"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dbTable" className="text-xs">
              Table Name (optional)
            </Label>
            <Input
              id="dbTable"
              value={(config?.dbTable as string) || ''}
              onChange={(e) => onUpdateConfig('dbTable', e.target.value)}
              placeholder="users"
              disabled={disabled}
            />
          </div>
        </>
      )}

      {/* HTTP Request fields */}
      {config?.actionType === 'HTTP Request' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="httpMethod" className="text-xs">
              HTTP Method
            </Label>
            <Select
              value={(config?.httpMethod as string) || 'POST'}
              onValueChange={(value) => onUpdateConfig('httpMethod', value)}
              disabled={disabled}
            >
              <SelectTrigger id="httpMethod">
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
            <Label htmlFor="endpoint" className="text-xs">
              URL
            </Label>
            <Input
              id="endpoint"
              value={(config?.endpoint as string) || ''}
              onChange={(e) => onUpdateConfig('endpoint', e.target.value)}
              placeholder="https://api.example.com/endpoint"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="httpHeaders" className="text-xs">
              Headers (JSON)
            </Label>
            <div className="overflow-hidden rounded-md border">
              <Editor
                height="100px"
                defaultLanguage="json"
                value={(config?.httpHeaders as string) || '{}'}
                onChange={(value) => onUpdateConfig('httpHeaders', value || '{}')}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: 'off',
                  scrollBeyondLastLine: false,
                  fontSize: 12,
                  readOnly: disabled,
                }}
                theme="vs-dark"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="httpBody" className="text-xs">
              Body (JSON)
            </Label>
            <div className="overflow-hidden rounded-md border">
              <Editor
                height="120px"
                defaultLanguage="json"
                value={(config?.httpBody as string) || '{}'}
                onChange={(value) => onUpdateConfig('httpBody', value || '{}')}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: 'off',
                  scrollBeyondLastLine: false,
                  fontSize: 12,
                  readOnly: disabled,
                }}
                theme="vs-dark"
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
