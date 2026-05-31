import type { StatusBadgeTone } from "@/components/ui/status-badge/status-badge"
import type { InternRunHistoryEvent } from "@/features/intern-runs/lib/intern-run-history-event"
import { internRunHistoryEventKindTone } from "@/features/intern-runs/lib/intern-run-history-event-kind-tone"

export const getInternRunHistoryEventTone = (
  event: InternRunHistoryEvent,
): StatusBadgeTone =>
  event.kind === "tool" && event.title === "skill"
    ? "skill"
    : internRunHistoryEventKindTone[event.kind]
