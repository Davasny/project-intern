import { reconcileExecutions } from "@/features/execution/lib/execution-reconciler"

export const repairStuckTaskRecords = async (limit = 100) =>
  reconcileExecutions({ limit })
