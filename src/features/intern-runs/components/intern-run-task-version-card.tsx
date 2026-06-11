import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"

type InternRunTaskVersionCardProps = {
  organizationSlug: string
  projectSlug: string
  taskId: string
  version: {
    createdAt: Date | null
    descriptionMarkdown: string | null
    id: string | null
    model: string | null
    schemaVersion: number | null
    temperature: number | null
    title: string | null
    versionNumber: number | null
  }
}

export const InternRunTaskVersionCard = ({
  organizationSlug,
  projectSlug,
  taskId,
  version,
}: InternRunTaskVersionCardProps) => (
  <SectionCard>
    <SectionCardHeader>
      <div className="flex flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">
            Executed task definition
          </h2>
          <p className="text-sm text-muted-foreground">
            The immutable task snapshot attached to this intern run.
          </p>
        </div>
        {version.versionNumber !== null ? (
          <Badge className="border-foreground/20 bg-foreground text-background">
            v{version.versionNumber}
          </Badge>
        ) : (
          <Badge>Legacy run</Badge>
        )}
      </div>
    </SectionCardHeader>
    <SectionCardContent>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 rounded-2xl border bg-muted/20 p-4">
          <div className="flex flex-row flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">
              {version.title ?? "No task version snapshot"}
            </h3>
            {version.schemaVersion !== null ? (
              <Badge>Schema {version.schemaVersion}</Badge>
            ) : null}
            <Badge>{version.model ?? "Project model"}</Badge>
            <Badge>
              {version.temperature !== null
                ? `Temp ${version.temperature.toFixed(1)}`
                : "Project temp"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {version.createdAt !== null
              ? `Frozen ${version.createdAt.toLocaleString()}`
              : "This run predates task definition version binding."}
          </p>
        </div>
        {version.descriptionMarkdown !== null ? (
          <pre className="max-h-56 overflow-auto rounded-2xl border bg-background p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {version.descriptionMarkdown}
          </pre>
        ) : null}
        <div className="flex flex-row justify-end">
          <Link
            className="text-sm font-medium text-foreground hover:text-muted-foreground"
            href={`/app/${organizationSlug}/${projectSlug}/tasks/${taskId}`}
          >
            Open task ledger
          </Link>
        </div>
      </div>
    </SectionCardContent>
  </SectionCard>
)
