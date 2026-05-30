import { JsonViewer } from "@/components/ui/json-viewer/json-viewer"
import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import { AgentRunHistoryMetricList } from "@/features/agent-runs/components/agent-run-history-metric-list"
import type { AgentRunHistoryEvent } from "@/features/agent-runs/lib/agent-run-history-event"
import { agentRunHistoryEventKindTone } from "@/features/agent-runs/lib/agent-run-history-event-kind-tone"

type AgentRunHistoryEventDetailProps = {
  event: AgentRunHistoryEvent | null
}

const DetailTextBlock = ({ label, text }: { label: string; text: string }) => (
  <div className="w-full min-w-0 max-w-full space-y-2 overflow-hidden">
    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {label}
    </span>
    <pre className="max-h-[420px] w-full min-w-0 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-border bg-muted/60 p-4 text-xs leading-5 text-foreground [scrollbar-width:thin]">
      {text}
    </pre>
  </div>
)

export const AgentRunHistoryEventDetail = ({
  event,
}: AgentRunHistoryEventDetailProps) => {
  if (!event) {
    return (
      <div className="flex min-h-64 items-center justify-center p-6 text-sm text-muted-foreground">
        Select an event to inspect its details.
      </div>
    )
  }

  return (
    <div className="max-h-[72vh] min-w-0 max-w-full overflow-x-hidden overflow-y-auto bg-card [scrollbar-width:thin]">
      <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border/70 bg-card px-5 py-4">
        <div className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={event.kind}
              tone={agentRunHistoryEventKindTone[event.kind]}
            />
            <span className="text-xs text-muted-foreground">
              {new Date(event.timestamp).toLocaleString()}
            </span>
          </div>
          <AgentRunHistoryMetricList alignment="end" metrics={event.metrics} />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="truncate text-xl font-semibold tracking-tight text-foreground">
            {event.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {event.summary}
          </p>
        </div>
      </div>
      <div className="flex min-w-0 max-w-full flex-col gap-5 overflow-hidden px-5 pb-5 pt-5">
        {event.detail.output ? (
          <DetailTextBlock label="Output" text={event.detail.output} />
        ) : null}
        {event.detail.content ? (
          <DetailTextBlock label="Content" text={event.detail.content} />
        ) : null}
        {event.detail.input ? (
          <div className="min-w-0 max-w-full space-y-2 overflow-hidden">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Input
            </span>
            <div className="max-w-full overflow-auto rounded-xl border border-border bg-muted/40 p-3 [scrollbar-width:thin]">
              <JsonViewer value={event.detail.input} />
            </div>
          </div>
        ) : null}
        {event.detail.error ? (
          <DetailTextBlock label="Error" text={event.detail.error} />
        ) : null}
        {event.detail.metadata ? (
          <div className="min-w-0 max-w-full space-y-2 overflow-hidden">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Metadata
            </span>
            <div className="max-w-full overflow-auto rounded-xl border border-border bg-muted/40 p-3 [scrollbar-width:thin]">
              <JsonViewer value={event.detail.metadata} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
