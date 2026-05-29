import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

type TaskRunConfigurationProps = {
  createdAt: Date
  effectiveModel: string
  effectiveTemperature: number
  model: string | null
  temperature: number | null
  updatedAt: Date
}

export const TaskRunConfiguration = ({
  createdAt,
  effectiveModel,
  effectiveTemperature,
  model,
  temperature,
  updatedAt,
}: TaskRunConfigurationProps) => (
  <Collapsible className="rounded-xl border border-border bg-muted/20">
    <CollapsibleTrigger className="flex w-full cursor-pointer flex-row items-center justify-between gap-3 px-4 py-3 text-left">
      <span className="text-sm font-medium text-foreground">Run configuration</span>
      <span className="text-xs text-muted-foreground">Model, temperature, timestamps</span>
    </CollapsibleTrigger>
    <CollapsibleContent className="border-t border-border px-4 py-4">
      <dl className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Model override
          </dt>
          <dd className="text-sm text-foreground">
            {model ?? "Use project default"}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Temperature override
          </dt>
          <dd className="text-sm text-foreground">
            {temperature === null ? "Use project default" : temperature.toFixed(1)}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Effective model
          </dt>
          <dd className="break-words text-sm text-foreground">{effectiveModel}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Effective temperature
          </dt>
          <dd className="text-sm text-foreground">
            {effectiveTemperature.toFixed(1)}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Created
          </dt>
          <dd className="text-sm text-foreground">{createdAt.toLocaleString()}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Updated
          </dt>
          <dd className="text-sm text-foreground">{updatedAt.toLocaleString()}</dd>
        </div>
      </dl>
    </CollapsibleContent>
  </Collapsible>
)
