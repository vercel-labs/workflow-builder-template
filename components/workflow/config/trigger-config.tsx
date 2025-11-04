'use client';

import { Webhook, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TimezoneSelect } from '@/components/ui/timezone-select';

interface TriggerConfigProps {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}

export function TriggerConfig({ config, onUpdateConfig, disabled }: TriggerConfigProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="triggerType">Trigger Type</Label>
        <Select
          value={(config?.triggerType as string) || 'Manual'}
          onValueChange={(value) => onUpdateConfig('triggerType', value)}
          disabled={disabled}
        >
          <SelectTrigger id="triggerType" className="w-full">
            <SelectValue placeholder="Select trigger type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel className="flex items-center gap-2">
                <Settings className="h-3 w-3" />
                System
              </SelectLabel>
              <SelectItem value="Manual">Manual</SelectItem>
              <SelectItem value="Schedule">Schedule</SelectItem>
              <SelectItem value="Database Event">Database Event</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="flex items-center gap-2">
                <Webhook className="h-3 w-3" />
                Webhooks
              </SelectLabel>
              <SelectItem value="Webhook">Webhook</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Webhook fields */}
      {config?.triggerType === 'Webhook' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="webhookPath">Webhook Path</Label>
            <Input
              id="webhookPath"
              value={(config?.webhookPath as string) || ''}
              onChange={(e) => onUpdateConfig('webhookPath', e.target.value)}
              placeholder="/webhooks/my-workflow"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhookMethod">HTTP Method</Label>
            <Select
              value={(config?.webhookMethod as string) || 'POST'}
              onValueChange={(value) => onUpdateConfig('webhookMethod', value)}
              disabled={disabled}
            >
              <SelectTrigger id="webhookMethod" className="w-full">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Schedule fields */}
      {config?.triggerType === 'Schedule' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="scheduleCron">Cron Expression</Label>
            <Input
              id="scheduleCron"
              value={(config?.scheduleCron as string) || ''}
              onChange={(e) => onUpdateConfig('scheduleCron', e.target.value)}
              placeholder="0 9 * * * (every day at 9am)"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduleTimezone">Timezone</Label>
            <TimezoneSelect
              id="scheduleTimezone"
              value={(config?.scheduleTimezone as string) || 'America/New_York'}
              onValueChange={(value) => onUpdateConfig('scheduleTimezone', value)}
              disabled={disabled}
            />
          </div>
        </>
      )}

      {/* Database Event fields */}
      {config?.triggerType === 'Database Event' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="dbEventTable">Table Name</Label>
            <Input
              id="dbEventTable"
              value={(config?.dbEventTable as string) || ''}
              onChange={(e) => onUpdateConfig('dbEventTable', e.target.value)}
              placeholder="users"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dbEventType">Event Type</Label>
            <Select
              value={(config?.dbEventType as string) || 'INSERT'}
              onValueChange={(value) => onUpdateConfig('dbEventType', value)}
              disabled={disabled}
            >
              <SelectTrigger id="dbEventType" className="w-full">
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INSERT">INSERT</SelectItem>
                <SelectItem value="UPDATE">UPDATE</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </>
  );
}
