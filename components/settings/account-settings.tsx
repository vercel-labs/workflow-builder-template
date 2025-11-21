import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AccountSettingsProps = {
  accountName: string;
  accountEmail: string;
  onNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
};

export function AccountSettings({
  accountName,
  accountEmail,
  onNameChange,
  onEmailChange,
}: AccountSettingsProps) {
  return (
    <Card className="border-0 py-0 shadow-none">
      <CardContent className="space-y-4 p-0">
        <div className="space-y-2">
          <Label className="ml-1" htmlFor="accountName">
            Name
          </Label>
          <Input
            id="accountName"
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Your name"
            value={accountName}
          />
        </div>

        <div className="space-y-2">
          <Label className="ml-1" htmlFor="accountEmail">
            Email
          </Label>
          <Input
            id="accountEmail"
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="your.email@example.com"
            type="email"
            value={accountEmail}
          />
        </div>
      </CardContent>
    </Card>
  );
}
