import { claimNextWorkRecord } from "@/features/execution/lib/claim-next-work-record"

export const schedulerService = async () => claimNextWorkRecord()
