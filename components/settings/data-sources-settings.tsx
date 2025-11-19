import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "../ui/checkbox";

type DataSource = {
  id: string;
  name: string;
  type: "postgresql" | "mysql" | "mongodb";
  connectionString: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

type DataSourcesSettingsProps = {
  dataSources: DataSource[];
  showAddSource: boolean;
  newSourceName: string;
  newSourceConnectionString: string;
  newSourceIsDefault: boolean;
  savingSource: boolean;
  onShowAddSource: (show: boolean) => void;
  onNewSourceNameChange: (name: string) => void;
  onNewSourceConnectionStringChange: (connectionString: string) => void;
  onNewSourceIsDefaultChange: (isDefault: boolean) => void;
  onAddSource: () => Promise<void>;
  onDeleteSource: (id: string) => void;
};

export function DataSourcesSettings({
  dataSources,
  showAddSource,
  newSourceName,
  newSourceConnectionString,
  newSourceIsDefault,
  savingSource,
  onShowAddSource,
  onNewSourceNameChange,
  onNewSourceConnectionStringChange,
  onNewSourceIsDefaultChange,
  onAddSource,
  onDeleteSource,
}: DataSourcesSettingsProps) {
  return (
    <>
      <Card className="border-0 py-0 shadow-none">
        <CardHeader className="px-0">
          <CardTitle>Data Sources</CardTitle>
          <CardDescription>Manage your database connections</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {dataSources.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm flex flex-col gap-4 max-w-xs mx-auto">
              No data sources configured.
              <Button onClick={() => onShowAddSource(true)} size="sm">
                <Plus className="size-4" />
                Add Source
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {dataSources.map((source) => (
                <div
                  className="flex items-start justify-between rounded-lg border p-4"
                  key={source.id}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{source.name}</h3>
                      {source.isDefault && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground text-xs">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-muted-foreground text-sm">
                      Type: {source.type.toUpperCase()}
                    </p>
                    <p className="mt-1 font-mono text-muted-foreground text-xs">
                      {source.connectionString}
                    </p>
                  </div>
                  <Button
                    onClick={() => onDeleteSource(source.id)}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showAddSource && (
        <Card className="border-0 bg-secondary shadow-none">
          <CardHeader>
            <CardTitle>Add Data Source</CardTitle>
            <CardDescription>
              Configure a new database connection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sourceName">Name</Label>
              <Input
                className="bg-background"
                id="sourceName"
                onChange={(e) => onNewSourceNameChange(e.target.value)}
                placeholder="Production Database"
                value={newSourceName}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceType">Type</Label>
              <Input
                className="bg-background"
                disabled
                id="sourceType"
                value="PostgreSQL"
              />
              <p className="text-muted-foreground text-xs">
                Currently only PostgreSQL is supported
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceConnectionString">Connection String</Label>
              <Input
                className="bg-background"
                id="sourceConnectionString"
                onChange={(e) =>
                  onNewSourceConnectionStringChange(e.target.value)
                }
                placeholder="postgresql://user:password@host:port/database"
                type="password"
                value={newSourceConnectionString}
              />
              <p className="text-muted-foreground text-xs">
                Format: postgresql://username:password@host:port/database
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={newSourceIsDefault}
                className="bg-background"
                id="sourceIsDefault"
                onCheckedChange={onNewSourceIsDefaultChange}
              />
              <Label
                className="cursor-pointer font-normal"
                htmlFor="sourceIsDefault"
              >
                Set as default data source
              </Label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button disabled={savingSource} onClick={onAddSource}>
                {savingSource ? "Adding..." : "Add Source"}
              </Button>
              <Button onClick={() => onShowAddSource(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
