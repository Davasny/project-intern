import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import { AgentRunHistoryMetricList } from "@/features/agent-runs/components/agent-run-history-metric-list"
import type { AgentRunHistoryEvent } from "@/features/agent-runs/lib/agent-run-history-event"
import { cn } from "@/lib/utils"

type AgentRunHistoryEventListProps = {
  events: Array<AgentRunHistoryEvent>
  selectedEventId: string | null
  onSelectEvent: (eventId: string) => void
}

const eventKindTone = {
  agent: "success",
  error: "danger",
  file: "muted",
  metadata: "muted",
  reasoning: "info",
  system: "info",
  tool: "info",
} satisfies Record<AgentRunHistoryEvent["kind"], "danger" | "info" | "muted" | "success" | "warning">

export const AgentRunHistoryEventList = ({
  events,
  selectedEventId,
  onSelectEvent,
}: AgentRunHistoryEventListProps) => (
  <div className="max-h-[72vh] overflow-y-auto [scrollbar-width:thin]">
    {events.map((event, index) => (
      <button
        className={cn(
          "group grid w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] gap-3 border-b border-border/60 px-5 py-3 text-left transition hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          selectedEventId === event.id
            ? "bg-muted/70 shadow-[inset_3px_0_0_hsl(var(--foreground))]"
            : null,
        )}
        key={event.id}
        onClick={() => onSelectEvent(event.id)}
        type="button"
      >
        <div className="pt-0.5 font-mono text-[11px] text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 items-center gap-2">
            <StatusBadge label={event.kind} tone={eventKindTone[event.kind]} />
            <span className="truncate text-sm font-medium text-foreground">
              {event.title}
            </span>
          </div>
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {event.summary}
          </p>
          {event.metadata.length > 0 ? (
            <p className="truncate text-xs text-muted-foreground/80">
              {event.metadata.slice(0, 3).join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1 pt-0.5">
          <span className="text-xs text-muted-foreground">
            {new Date(event.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
          <AgentRunHistoryMetricList metrics={event.metrics} />
        </div>
      </button>
    ))}
  </div>
)
