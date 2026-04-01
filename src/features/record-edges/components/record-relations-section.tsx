"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { ActivityTimeline } from "@/components/ui/activity-timeline/activity-timeline"
import { Button } from "@/components/ui/button"
import { DataTableEmptyState } from "@/components/ui/data-table/data-table-empty-state"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { MetadataList } from "@/components/ui/metadata-list/metadata-list"
import { MetadataListItem } from "@/components/ui/metadata-list/metadata-list-item"
import { RelationList } from "@/components/ui/relation-list/relation-list"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { RecordRelationListItem } from "@/features/record-edges/components/record-relation-list-item"
import { RelationActivityItem } from "@/features/record-edges/components/relation-activity-item"
import { RelationEditorPanel } from "@/features/record-edges/components/relation-editor-panel"
import { useTRPC } from "@/lib/trpc/client"

type RecordRelationsSectionProps = {
  organizationSlug: string
  projectSlug: string
  recordId: string
}

export const RecordRelationsSection = ({
  organizationSlug,
  projectSlug,
  recordId,
}: RecordRelationsSectionProps) => {
  const trpc = useTRPC()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const relationsQuery = useQuery(
    trpc.recordEdges.listForRecord.queryOptions({
      organizationSlug,
      projectSlug,
      recordId,
    }),
  )
  const activityQuery = useQuery(
    trpc.recordEdges.listActivity.queryOptions({
      organizationSlug,
      projectSlug,
      recordId,
    }),
  )

  if (relationsQuery.isLoading || activityQuery.isLoading) {
    return <LoadingState label="Loading relations..." />
  }

  if (!relationsQuery.data || !activityQuery.data) {
    return <LoadingState label="Relations could not be loaded." />
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard>
        <SectionCardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-slate-950">
                Related records
              </h2>
              <p className="text-sm text-slate-500">
                Canonical depth-1 linked record reads backed by active relation
                edges.
              </p>
            </div>
            <Button
              onClick={() => setIsCreateOpen(!isCreateOpen)}
              type="button"
            >
              {isCreateOpen ? "Hide relation editor" : "New relation"}
            </Button>
          </div>
        </SectionCardHeader>
        <SectionCardContent className="flex flex-col gap-6">
          <MetadataList>
            <MetadataListItem
              label="Active relations"
              value={String(relationsQuery.data.summary.activeCount)}
            />
            <MetadataListItem
              label="Outbound"
              value={String(relationsQuery.data.summary.outboundCount)}
            />
            <MetadataListItem
              label="Inbound"
              value={String(relationsQuery.data.summary.inboundCount)}
            />
            <MetadataListItem
              label="Relation types"
              value={
                relationsQuery.data.summary.relationTypes.length > 0
                  ? relationsQuery.data.summary.relationTypes.join(", ")
                  : "No active relations"
              }
            />
          </MetadataList>
          {relationsQuery.data.relations.length > 0 ? (
            <RelationList>
              {relationsQuery.data.relations.map((relation) => (
                <RecordRelationListItem
                  key={relation.id}
                  organizationSlug={organizationSlug}
                  projectSlug={projectSlug}
                  recordId={recordId}
                  relation={relation}
                />
              ))}
            </RelationList>
          ) : (
            <DataTableEmptyState
              action={
                <Button onClick={() => setIsCreateOpen(true)} type="button">
                  Create first relation
                </Button>
              }
              description="Relations stay outside record context and remain auditable through canonical edges."
              title="No active relations"
            />
          )}
          {isCreateOpen ? (
            <RelationEditorPanel
              initialValues={{
                confidence: "",
                direction: "outbound",
                notes: "",
                recordEdgeId: null,
                relationType: "related_to",
                source: "",
                targetProjectSlug: projectSlug,
                targetRecordId: "",
              }}
              mode="create"
              onSubmitted={() => setIsCreateOpen(false)}
              organizationSlug={organizationSlug}
              projectSlug={projectSlug}
              recordId={recordId}
            />
          ) : null}
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardHeader>
          <h2 className="text-lg font-semibold text-slate-950">
            Relation activity
          </h2>
          <p className="text-sm text-slate-500">
            Append-only relation lifecycle events for this record scope.
          </p>
        </SectionCardHeader>
        <SectionCardContent>
          {activityQuery.data.length > 0 ? (
            <ActivityTimeline>
              {activityQuery.data.map((activity) => (
                <RelationActivityItem activity={activity} key={activity.id} />
              ))}
            </ActivityTimeline>
          ) : (
            <DataTableEmptyState
              action={null}
              description="Create, edit, or deactivate a relation to start building this audit trail."
              title="No relation activity yet"
            />
          )}
        </SectionCardContent>
      </SectionCard>
    </div>
  )
}
