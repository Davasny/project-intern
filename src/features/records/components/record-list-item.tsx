import Link from "next/link"
import { Card } from "@/components/ui/card"

type RecordListItemProps = {
  organizationSlug: string
  projectSlug: string
  record: {
    id: string
    name: string
    schemaVersion: number
    state: string
    updatedAt: Date
    version: number
  }
}

export const RecordListItem = ({
  organizationSlug,
  projectSlug,
  record,
}: RecordListItemProps) => (
  <Card className="p-4">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1">
        <Link
          className="text-base font-semibold text-slate-900 hover:underline"
          href={`/app/${organizationSlug}/${projectSlug}/records/${record.id}`}
        >
          {record.name}
        </Link>
        <p className="text-sm text-slate-500">{record.id}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span className="rounded-full bg-slate-100 px-3 py-1">
          {record.state}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1">
          schema v{record.schemaVersion}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1">
          row v{record.version}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1">
          updated {record.updatedAt.toLocaleString()}
        </span>
      </div>
    </div>
  </Card>
)
