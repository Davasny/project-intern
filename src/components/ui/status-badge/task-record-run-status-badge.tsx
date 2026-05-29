import Link from "next/link"
import { TaskRecordStatusBadge } from "@/components/ui/status-badge/task-record-status-badge"
import type { TaskRecordState } from "@/features/task-records/schemas/task-record-state"

type TaskRecordRunStatusBadgeProps = {
  runHref: string | null
  state: TaskRecordState
}

export const TaskRecordRunStatusBadge = ({
  runHref,
  state,
}: TaskRecordRunStatusBadgeProps) =>
  runHref === null ? (
    <TaskRecordStatusBadge state={state} />
  ) : (
    <Link
      className="inline-flex w-fit rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href={runHref}
    >
      <TaskRecordStatusBadge state={state} />
    </Link>
  )
