import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemplateBadgeTextarea } from "@/components/ui/template-badge-textarea";

/**
 * Generate Image Config Fields Component
 */
export function GenerateImageConfigFields({
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
        <Label htmlFor="imageModel">Model</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("imageModel", value)}
          value={
            (config?.imageModel as string) || "google/imagen-4.0-generate"
          }
        >
          <SelectTrigger className="w-full" id="imageModel">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="google/imagen-4.0-generate">
              Imagen 4.0 (Google)
            </SelectItem>
            <SelectItem value="openai/dall-e-3">DALL-E 3 (OpenAI)</SelectItem>
            <SelectItem value="openai/dall-e-2">DALL-E 2 (OpenAI)</SelectItem>
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

