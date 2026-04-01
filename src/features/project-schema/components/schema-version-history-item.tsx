import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

type SchemaVersionHistoryItemProps = {
  canCompare: boolean
  isActive: boolean
  onCompare: () => void
  version: {
    id: string
    version: number
  }
}

export const SchemaVersionHistoryItem = ({
  canCompare,
  isActive,
  onCompare,
  version,
}: SchemaVersionHistoryItemProps) => (
  <Card className="p-4">
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-slate-900">
          Version {version.version}
        </h3>
        <p className="text-xs text-slate-500">{version.id}</p>
      </div>
      <div className="flex items-center gap-2">
        {isActive ? (
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white">
            active
          </span>
        ) : null}
        <Button
          disabled={!canCompare}
          onClick={onCompare}
          type="button"
          variant="secondary"
        >
          Compare
        </Button>
      </div>
    </div>
  </Card>
)
