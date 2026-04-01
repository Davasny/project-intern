import { runTaskSchedulerTick } from "@/features/execution/lib/run-task-scheduler-tick"

type RunTaskRetryScanParams = {
  limit: number
}

export const runTaskRetryScan = ({ limit }: RunTaskRetryScanParams) =>
  runTaskSchedulerTick({ limit })
