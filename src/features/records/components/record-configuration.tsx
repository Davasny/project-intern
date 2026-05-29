import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { JsonViewer } from "@/components/ui/json-viewer/json-viewer"

type RecordConfigurationProps = {
  context: Record<string, unknown>
  createdAt: Date
  schemaVersion: number
  updatedAt: Date
  version: number
}

export const RecordConfiguration = ({
  context,
  createdAt,
  schemaVersion,
  updatedAt,
  version,
}: RecordConfigurationProps) => (
  <aside className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
    <div className="flex flex-col gap-1">
      <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
        Record metadata
      </h2>
      <dl className="grid gap-3 pt-2">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Record version
          </dt>
          <dd className="font-mono text-sm text-foreground tabular-nums">{version}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Schema version
          </dt>
          <dd className="font-mono text-sm text-foreground tabular-nums">
            {schemaVersion}
          </dd>
        </div>
      </dl>
    </div>

    <Collapsible className="rounded-xl border border-border bg-muted/20">
      <CollapsibleTrigger className="flex w-full cursor-pointer flex-row items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="text-sm font-medium text-foreground">Timestamps</span>
        <span className="text-xs text-muted-foreground">Created, updated</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border px-4 py-4">
        <dl className="grid gap-4">
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Created
            </dt>
            <dd className="text-sm text-foreground">{createdAt.toLocaleString()}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Updated
            </dt>
            <dd className="text-sm text-foreground">{updatedAt.toLocaleString()}</dd>
          </div>
        </dl>
      </CollapsibleContent>
    </Collapsible>

    <Collapsible className="rounded-xl border border-border bg-muted/20">
      <CollapsibleTrigger className="flex w-full cursor-pointer flex-row items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="text-sm font-medium text-foreground">Raw context</span>
        <span className="text-xs text-muted-foreground">JSON</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border px-4 py-4">
        <JsonViewer value={context} />
      </CollapsibleContent>
    </Collapsible>
  </aside>
)
