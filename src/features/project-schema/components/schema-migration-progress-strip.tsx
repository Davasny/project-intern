import { ProgressStrip } from "@/components/ui/progress-strip/progress-strip"

type SchemaMigrationProgressStripProps = {
  affectedRecordCount: number
  completedCount: number
  pendingRecordCount: number
  totalRecordCount: number
}

export const SchemaMigrationProgressStrip = ({
  affectedRecordCount,
  completedCount,
  pendingRecordCount,
  totalRecordCount,
}: SchemaMigrationProgressStripProps) => (
  <ProgressStrip
    items={[
      { label: "Records", value: totalRecordCount },
      { label: "Affected", value: affectedRecordCount },
      { label: "Pending", value: pendingRecordCount },
      { label: "Completed", value: completedCount },
    ]}
  />
)
