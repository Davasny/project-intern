import type { StatusBadgeTone } from "@/components/ui/status-badge/status-badge"
import type { InternRunHistoryEventKind } from "@/features/intern-runs/lib/intern-run-history-event"

export const internRunHistoryEventKindTone = {
  agent: "success",
  error: "danger",
  file: "muted",
  metadata: "muted",
  reasoning: "warning",
  system: "info",
  tool: "info",
} satisfies Record<InternRunHistoryEventKind, StatusBadgeTone>
