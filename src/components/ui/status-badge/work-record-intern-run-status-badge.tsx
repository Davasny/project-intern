import Link from "next/link"
import { WorkRecordStatusBadge } from "@/components/ui/status-badge/work-record-status-badge"
import type { WorkRecordState } from "@/features/work-records/schemas/work-record-state"

type WorkRecordRunStatusBadgeProps = {
  runHref: string | null
  state: WorkRecordState
}

export const WorkRecordRunStatusBadge = ({
  runHref,
  state,
}: WorkRecordRunStatusBadgeProps) =>
  runHref === null ? (
    <WorkRecordStatusBadge state={state} />
  ) : (
    <Link
      className="inline-flex w-fit rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href={runHref}
    >
      <WorkRecordStatusBadge state={state} />
    </Link>
  )
