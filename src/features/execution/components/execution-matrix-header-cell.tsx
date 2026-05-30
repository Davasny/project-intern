import Link from "next/link"
import { TableHeader } from "@/components/ui/table"

type ExecutionMatrixHeaderCellProps = {
  organizationSlug: string
  projectSlug: string
  task: {
    id: string
    title: string
  }
}

export const ExecutionMatrixHeaderCell = ({
  organizationSlug,
  projectSlug,
  task,
}: ExecutionMatrixHeaderCellProps) => (
  <TableHeader className="min-w-40 whitespace-normal break-words text-xs normal-case tracking-normal">
    <div className="flex flex-col gap-1">
      <Link
        className="font-semibold text-foreground hover:text-muted-foreground"
        href={`/app/${organizationSlug}/${projectSlug}/tasks/${task.id}`}
      >
        {task.title}
      </Link>
    </div>
  </TableHeader>
)
