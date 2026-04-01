import { listRecordRelationsByProjectId } from "@/features/record-edges/lib/list-record-relations-by-project-id"

type GetRelatedRecordsByProjectIdParams = {
  projectId: string
  recordId: string
}

export const getRelatedRecordsByProjectId = async ({
  projectId,
  recordId,
}: GetRelatedRecordsByProjectIdParams) => {
  const relationList = await listRecordRelationsByProjectId({
    projectId,
    recordId,
  })

  return relationList.relations.map((relation) => ({
    edge: {
      createdAt: relation.createdAt,
      createdByTaskId: relation.createdByTaskId,
      direction: relation.direction,
      id: relation.id,
      metadata: relation.metadata,
      relationType: relation.relationType,
      state: relation.state,
      updatedAt: relation.updatedAt,
    },
    relatedRecord: relation.relatedRecord,
  }))
}
