"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useState } from "react"
import { ActivityTimelineItem } from "@/components/ui/activity-timeline/activity-timeline-item"
import { Button } from "@/components/ui/button"
import { JsonViewer } from "@/components/ui/json-viewer/json-viewer"
import { MetadataList } from "@/components/ui/metadata-list/metadata-list"
import { MetadataListItem } from "@/components/ui/metadata-list/metadata-list-item"
import { RelationListItem } from "@/components/ui/relation-list/relation-list-item"
import { RecordEdgeStatusBadge } from "@/components/ui/status-badge/record-edge-status-badge"
import { RelationEditorPanel } from "@/features/record-edges/components/relation-editor-panel"
import type { RelationType } from "@/features/record-edges/lib/relation-type-rules"
import { useTRPC } from "@/lib/trpc/client"

type RecordRelationListItemProps = {
  organizationSlug: string
  projectSlug: string
  recordId: string
  relation: {
    canDeactivate: boolean
    canEdit: boolean
    createdAt: Date
    direction: "bidirectional" | "outbound"
    id: string
    metadata: Record<string, unknown>
    perspective: string
    relatedRecord: {
      context: Record<string, unknown>
      id: string
      name: string
      projectDisplayName: string
      projectSlug: string
      schemaVersion: number
      state: "active" | "archived" | "error" | "processing"
    }
    relationType: string
    relationTypeLabel: string
    state: "active" | "inactive"
    updatedAt: Date
  }
}

const getStringMetadataValue = (
  metadata: Record<string, unknown>,
  key: string,
) => {
  const value = metadata[key]
  return typeof value === "string" ? value : ""
}

const getConfidenceMetadataValue = (metadata: Record<string, unknown>) => {
  const value = metadata.confidence
  return typeof value === "number" ? String(value) : ""
}

export const RecordRelationListItem = ({
  organizationSlug,
  projectSlug,
  recordId,
  relation,
}: RecordRelationListItemProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)

  const deactivateRelationMutation = useMutation(
    trpc.recordEdges.deactivate.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.records.list.queryFilter({ organizationSlug, projectSlug }),
        )
        await queryClient.invalidateQueries(
          trpc.recordEdges.listForRecord.queryFilter({
            organizationSlug,
            projectSlug,
            recordId,
          }),
        )
        await queryClient.invalidateQueries(
          trpc.recordEdges.listActivity.queryFilter({
            organizationSlug,
            projectSlug,
            recordId,
          }),
        )
        await queryClient.invalidateQueries(
          trpc.records.list.queryFilter({
            organizationSlug,
            projectSlug: relation.relatedRecord.projectSlug,
          }),
        )
        await queryClient.invalidateQueries(
          trpc.records.getById.queryFilter({
            organizationSlug,
            projectSlug: relation.relatedRecord.projectSlug,
            recordId: relation.relatedRecord.id,
          }),
        )
        await queryClient.invalidateQueries(
          trpc.recordEdges.listForRecord.queryFilter({
            organizationSlug,
            projectSlug: relation.relatedRecord.projectSlug,
            recordId: relation.relatedRecord.id,
          }),
        )
        await queryClient.invalidateQueries(
          trpc.recordEdges.listActivity.queryFilter({
            organizationSlug,
            projectSlug: relation.relatedRecord.projectSlug,
            recordId: relation.relatedRecord.id,
          }),
        )
      },
    }),
  )

  const handleDeactivate = async () => {
    await deactivateRelationMutation.mutateAsync({
      input: {
        recordEdgeId: relation.id,
        recordId,
      },
      organizationSlug,
      projectSlug,
    })
  }

  return (
    <RelationListItem>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {relation.relationTypeLabel}
            </span>
            <RecordEdgeStatusBadge state={relation.state} />
          </div>
          <Link
            className="text-base font-semibold text-slate-950 hover:text-slate-600"
            href={`/app/${organizationSlug}/${relation.relatedRecord.projectSlug}/records/${relation.relatedRecord.id}`}
          >
            {relation.relatedRecord.name}
          </Link>
          <p className="text-sm text-slate-500">
            {relation.relatedRecord.projectDisplayName} · {relation.perspective}{" "}
            · {relation.direction}
          </p>
        </div>
        <div className="flex flex-row gap-2">
          {relation.canEdit ? (
            <Button
              onClick={() => setIsEditing(!isEditing)}
              type="button"
              variant="secondary"
            >
              {isEditing ? "Hide editor" : "Edit"}
            </Button>
          ) : null}
          {relation.canDeactivate ? (
            <Button
              disabled={deactivateRelationMutation.isPending}
              onClick={handleDeactivate}
              type="button"
              variant="secondary"
            >
              {deactivateRelationMutation.isPending
                ? "Deactivating..."
                : "Deactivate"}
            </Button>
          ) : null}
        </div>
      </div>
      <MetadataList>
        <MetadataListItem
          label="Schema version"
          value={String(relation.relatedRecord.schemaVersion)}
        />
        <MetadataListItem
          label="Source"
          value={
            getStringMetadataValue(relation.metadata, "source") ||
            "Not provided"
          }
        />
        <MetadataListItem
          label="Confidence"
          value={
            getConfidenceMetadataValue(relation.metadata) || "Not provided"
          }
        />
        <MetadataListItem
          label="Updated"
          value={relation.updatedAt.toLocaleString()}
        />
      </MetadataList>
      {getStringMetadataValue(relation.metadata, "notes") ? (
        <ActivityTimelineItem
          description={getStringMetadataValue(relation.metadata, "notes")}
          label="Relation notes"
          timestamp={relation.createdAt.toLocaleString()}
        />
      ) : null}
      <JsonViewer value={relation.relatedRecord.context} />
      <RelationEditorPanel
        initialValues={{
          confidence: getConfidenceMetadataValue(relation.metadata),
          direction: relation.direction,
          notes: getStringMetadataValue(relation.metadata, "notes"),
          recordEdgeId: relation.id,
          relationType: relation.relationType as RelationType,
          source: getStringMetadataValue(relation.metadata, "source"),
          targetProjectSlug: relation.relatedRecord.projectSlug,
          targetRecordId: relation.relatedRecord.id,
        }}
        isOpen={isEditing}
        mode="edit"
        onOpenChange={setIsEditing}
        onSubmitted={() => setIsEditing(false)}
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        recordId={recordId}
      />
    </RelationListItem>
  )
}
