import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type InternRunHistoryMetadataFilterProps = {
  hideMetadata: boolean
  onHideMetadataChange: (hideMetadata: boolean) => void
}

export const InternRunHistoryMetadataFilter = ({
  hideMetadata,
  onHideMetadataChange,
}: InternRunHistoryMetadataFilterProps) => (
  <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5">
    <Switch
      checked={hideMetadata}
      id="intern-run-history-hide-metadata"
      onCheckedChange={onHideMetadataChange}
    />
    <Label
      className="text-xs font-medium text-muted-foreground"
      htmlFor="intern-run-history-hide-metadata"
    >
      Hide metadata
    </Label>
  </div>
)
