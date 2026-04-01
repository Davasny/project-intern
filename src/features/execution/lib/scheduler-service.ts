import { claimNextTaskRecord } from "@/features/execution/lib/claim-next-task-record"

export const schedulerService = async () => claimNextTaskRecord()
