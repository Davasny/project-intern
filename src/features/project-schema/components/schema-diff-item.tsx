import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

type SchemaDiffItemProps = {
  diff: {
    after: { label: string; type: string } | null
    before: { label: string; type: string } | null
    changeType: "added" | "removed" | "changed"
    key: string
  }
}

export const SchemaDiffItem = ({ diff }: SchemaDiffItemProps) => (
  <Card className="p-4">
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Badge className="bg-muted text-muted-foreground">
          {diff.changeType}
        </Badge>
        <span className="text-sm font-semibold text-foreground">
          {diff.key}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        {diff.before
          ? `${diff.before.label} (${diff.before.type})`
          : "missing before"}{" "}
        →{" "}
        {diff.after
          ? `${diff.after.label} (${diff.after.type})`
          : "missing after"}
      </p>
    </div>
  </Card>
)
