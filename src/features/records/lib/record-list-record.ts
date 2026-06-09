import type { InternRunState } from "@/features/intern-runs/schemas/intern-run-state"

export type RecordListRecord = {
  activeRun: {
    state: InternRunState
    statusTooltipText: string | null
  } | null
  id: string
  context: Record<string, unknown>
  name: string
  progress: {
    completedCount: number
    failedCount: number
    inProgressCount: number
    skippedCount: number
    totalCount: number
    waitingCount: number
  }
  relationSummary: {
    activeCount: number
  }
  schemaVersion: number
  state: "active" | "archived" | "error" | "inactive" | "processing"
  updatedAt: Date
  usage: {
    totalCostUsd: number
    totalTokens: number
  }
  version: number
}
