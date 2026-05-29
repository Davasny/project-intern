import { JsonViewer } from "@/components/ui/json-viewer/json-viewer"
import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import type { AgentRunHistoryEvent } from "@/features/agent-runs/lib/agent-run-history-event"

type AgentRunHistoryEventDetailProps = {
  event: AgentRunHistoryEvent | null
}

const eventKindTone = {
  agent: "success",
  error: "danger",
  file: "muted",
  metadata: "muted",
  reasoning: "info",
  tool: "info",
} satisfies Record<AgentRunHistoryEvent["kind"], "danger" | "info" | "muted" | "success" | "warning">

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
    <div className="max-h-[72vh] min-w-0 max-w-full overflow-x-hidden overflow-y-auto p-5 [scrollbar-width:thin]">
      <div className="sticky top-0 z-10 -mx-5 -mt-5 border-b border-border/70 bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StatusBadge label={event.kind} tone={eventKindTone[event.kind]} />
          <span className="text-xs text-muted-foreground">
            {new Date(event.timestamp).toLocaleString()}
          </span>
        </div>
        <div className="min-w-0 space-y-1">
          <h3 className="truncate text-xl font-semibold tracking-tight text-foreground">
            {event.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {event.summary}
          </p>
        </div>
      </div>
      <div className="flex min-w-0 max-w-full flex-col gap-5 overflow-hidden pt-5">
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
        {event.detail.output ? (
          <DetailTextBlock label="Output" text={event.detail.output} />
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
