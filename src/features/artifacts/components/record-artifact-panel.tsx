"use client"

import { useQuery } from "@tanstack/react-query"
import { ArtifactList } from "@/components/ui/artifact-list/artifact-list"
import { ArtifactListItem } from "@/components/ui/artifact-list/artifact-list-item"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { useTRPC } from "@/lib/trpc/client"
import { formatFileSize } from "@/utils/format-file-size"

type RecordArtifactPanelProps = {
  organizationSlug: string
  projectSlug: string
  recordId: string
}

export const RecordArtifactPanel = ({
  organizationSlug,
  projectSlug,
  recordId,
}: RecordArtifactPanelProps) => {
  const trpc = useTRPC()
  const artifactsQuery = useQuery(
    trpc.artifacts.list.queryOptions({
      organizationSlug,
      projectSlug,
      recordId,
    }),
  )

  if (artifactsQuery.isLoading) {
    return <LoadingState label="Loading artifacts..." />
  }

  return (
    <SectionCard>
      <SectionCardHeader>
        <h2 className="text-lg font-semibold text-slate-950">Artifacts</h2>
        <p className="text-sm text-slate-500">
          Derived outputs are canonically stored with lineage by file, stage,
          and source hash.
        </p>
      </SectionCardHeader>
      <SectionCardContent>
        {artifactsQuery.data && artifactsQuery.data.length > 0 ? (
          <ArtifactList>
            {artifactsQuery.data.map((artifact) => (
              <ArtifactListItem
                key={artifact.id}
                meta={`${artifact.stage} · ${artifact.state} · ${formatFileSize(artifact.sizeBytes)}`}
                title={artifact.fileName}
              />
            ))}
          </ArtifactList>
        ) : (
          <p className="text-sm text-slate-500">No artifacts registered yet.</p>
        )}
      </SectionCardContent>
    </SectionCard>
  )
}
