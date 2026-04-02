"use client"

import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SchemaDiffItem } from "@/features/project-schema/components/schema-diff-item"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

type SchemaDiffModalProps = {
  nextVersionId: string
  onClose: () => void
  previousVersionId: string
}

export const SchemaDiffModal = ({
  nextVersionId,
  onClose,
  previousVersionId,
}: SchemaDiffModalProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const diffQuery = useQuery(
    trpc.projectSchema.diffVersions.queryOptions({
      nextVersionId,
      organizationSlug,
      previousVersionId,
      projectSlug,
    }),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 p-6">
      <Card className="max-h-[80vh] w-full max-w-3xl overflow-auto p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">Schema diff</h2>
              <p className="text-sm text-muted-foreground">
                Compare schema version history inside the current project.
              </p>
            </div>
            <Button onClick={onClose} type="button" variant="ghost">
              Close
            </Button>
          </div>
          {diffQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading diff...</p>
          ) : diffQuery.data ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Comparing version {diffQuery.data.previousVersion.version} with
                version {diffQuery.data.nextVersion.version}.
              </p>
              {diffQuery.data.diffs.length > 0 ? (
                diffQuery.data.diffs.map((diff) => (
                  <SchemaDiffItem
                    diff={diff}
                    key={`${diff.changeType}-${diff.key}`}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No schema differences found.
                </p>
              )}
            </div>
          ) : (
            <p className="text-destructive text-sm">
              Schema diff could not be loaded.
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
