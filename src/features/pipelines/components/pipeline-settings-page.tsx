"use client"

import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

export const PipelineSettingsPage = () => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const pipelineDefinitionsQuery = useQuery(
    trpc.pipelines.listDefinitions.queryOptions({
      organizationSlug,
      projectSlug,
    }),
  )

  if (pipelineDefinitionsQuery.isLoading) {
    return <LoadingState label="Loading pipeline settings..." />
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-2 p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Pipeline settings
        </h1>
        <p className="text-sm text-slate-600">
          Parser bundles stay versioned and materialize into record workspaces
          without becoming canonical storage.
        </p>
      </Card>
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-950">
            Pipeline definitions
          </h2>
          <p className="text-sm text-slate-500">
            Phase 6 foundations expose stage order, pipeline version, and parser
            asset bundle contract visibility.
          </p>
        </div>
        {pipelineDefinitionsQuery.data &&
        pipelineDefinitionsQuery.data.length > 0 ? (
          <div className="flex flex-col gap-4">
            {pipelineDefinitionsQuery.data.map((pipelineDefinition) => (
              <Card
                className="flex flex-col gap-3 p-4"
                key={pipelineDefinition.id}
              >
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold text-slate-950">
                    {pipelineDefinition.name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Version {pipelineDefinition.version} · Parser assets{" "}
                    {pipelineDefinition.parserAssetVersion}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pipelineDefinition.stages.map((stage) => (
                    <span
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
                      key={stage}
                    >
                      {stage}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No pipeline definitions are visible for this project yet.
          </p>
        )}
      </Card>
    </div>
  )
}
