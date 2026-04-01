import { and, eq } from "drizzle-orm"
import { artifactTable } from "@/features/artifacts/db"
import { db } from "@/lib/db"

type GetReusableArtifactParams = {
  fileId: string
  pipelineVersion: string
  recordId: string
  sourceHash: string
  stage: string
}

export const getReusableArtifact = ({
  fileId,
  pipelineVersion,
  recordId,
  sourceHash,
  stage,
}: GetReusableArtifactParams) =>
  db
    .select()
    .from(artifactTable)
    .where(
      and(
        eq(artifactTable.fileId, fileId),
        eq(artifactTable.pipelineVersion, pipelineVersion),
        eq(artifactTable.recordId, recordId),
        eq(artifactTable.sourceHash, sourceHash),
        eq(artifactTable.stage, stage),
        eq(artifactTable.state, "available"),
      ),
    )
    .then((rows) => rows[0] ?? null)
