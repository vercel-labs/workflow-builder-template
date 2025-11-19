import { Button } from "@/components/ui/button";

type IntegrationTabContentProps = {
  children: React.ReactNode;
  hasKey?: boolean;
  saving: boolean;
  onSave: () => void;
  onRemove: () => void;
};

export function IntegrationTabContent({
  children,
  hasKey,
  saving,
  onSave,
  onRemove,
}: IntegrationTabContentProps) {
  return (
    <>
      {children}
      <div className="mt-4 flex justify-end gap-2">
        {hasKey && (
          <Button disabled={saving} onClick={onRemove} variant="outline">
            Remove
          </Button>
        )}
        <Button disabled={saving} onClick={onSave}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </>
  );
}
