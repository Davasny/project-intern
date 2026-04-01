import { and, asc, eq } from "drizzle-orm"
import { artifactTable } from "@/features/artifacts/db"
import { db } from "@/lib/db"

type ListArtifactsParams = {
  projectId: string
  recordId: string
}

export const listArtifacts = async ({
  projectId,
  recordId,
}: ListArtifactsParams) => {
  return db
    .select()
    .from(artifactTable)
    .where(
      and(
        eq(artifactTable.projectId, projectId),
        eq(artifactTable.recordId, recordId),
      ),
    )
    .orderBy(asc(artifactTable.createdAt))
}
