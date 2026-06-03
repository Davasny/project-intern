import Link from "next/link"
import { TableCell, TableRow } from "@/components/ui/table"
import { RunStatusBadge } from "@/components/ui/status-badge/intern-run-status-badge"
import { getInternRunListFilterValue } from "@/features/intern-runs/lib/get-intern-run-list-filter-value"
import type { InternRunListItem } from "@/features/intern-runs/lib/intern-run-list-item"

type InternRunListRowProps = {
  organizationSlug: string
  projectSlug: string
  run: InternRunListItem
}

export const InternRunListRow = ({
  organizationSlug,
  projectSlug,
  run,
}: InternRunListRowProps) => (
  <TableRow>
    <TableCell>
      <Link href={`/app/${organizationSlug}/${projectSlug}/intern-runs/${run.id}`}>
        <RunStatusBadge
          labelSuffix={null}
          state={run.state}
          tooltipText={run.statusTooltipText}
        />
      </Link>
    </TableCell>
    <TableCell>{getInternRunListFilterValue({ columnId: "provider", run })}</TableCell>
    <TableCell>{getInternRunListFilterValue({ columnId: "model", run })}</TableCell>
    <TableCell>
      {getInternRunListFilterValue({ columnId: "temperature", run })}
    </TableCell>
    <TableCell>
      {getInternRunListFilterValue({ columnId: "selectedIntern", run })}
    </TableCell>
    <TableCell>
      <Link
        className="font-medium text-foreground hover:text-muted-foreground"
        href={`/app/${organizationSlug}/${projectSlug}/tasks/${run.taskId}`}
      >
        {run.taskTitle}
      </Link>
    </TableCell>
    <TableCell>
      <Link
        className="font-medium text-foreground hover:text-muted-foreground"
        href={`/app/${organizationSlug}/${projectSlug}/records/${run.recordId}`}
      >
        {run.recordName}
      </Link>
    </TableCell>
    <TableCell>{getInternRunListFilterValue({ columnId: "attempt", run })}</TableCell>
    <TableCell>{getInternRunListFilterValue({ columnId: "duration", run })}</TableCell>
    <TableCell>{getInternRunListFilterValue({ columnId: "toolCalls", run })}</TableCell>
    <TableCell>{getInternRunListFilterValue({ columnId: "tokensIn", run })}</TableCell>
    <TableCell>{getInternRunListFilterValue({ columnId: "tokensOut", run })}</TableCell>
    <TableCell>{getInternRunListFilterValue({ columnId: "cost", run })}</TableCell>
    <TableCell>{getInternRunListFilterValue({ columnId: "started", run })}</TableCell>
  </TableRow>
)
