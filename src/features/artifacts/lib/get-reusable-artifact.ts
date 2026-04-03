import { and, eq } from "drizzle-orm"
import { artifactTable } from "@/features/artifacts/db"
import { db } from "@/lib/db"

type GetReusableArtifactParams = {
  filePath: string
  recordId: string
  sourceHash: string
  stage: string
}

export const getReusableArtifact = ({
  filePath,
  recordId,
  sourceHash,
  stage,
}: GetReusableArtifactParams) =>
  db
    .select()
    .from(artifactTable)
    .where(
      and(
        eq(artifactTable.filePath, filePath),
        eq(artifactTable.recordId, recordId),
        eq(artifactTable.sourceHash, sourceHash),
        eq(artifactTable.stage, stage),
        eq(artifactTable.state, "available"),
      ),
    )
    .then((rows) => rows[0] ?? null)
