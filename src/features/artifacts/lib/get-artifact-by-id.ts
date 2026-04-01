import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { artifactTable } from "@/features/artifacts/db"
import { db } from "@/lib/db"

type GetArtifactByIdParams = {
  artifactId: string
  projectId: string
  recordId: string
}

export const getArtifactById = async ({
  artifactId,
  projectId,
  recordId,
}: GetArtifactByIdParams) => {
  const artifact = await db
    .select()
    .from(artifactTable)
    .where(
      and(
        eq(artifactTable.id, artifactId),
        eq(artifactTable.projectId, projectId),
        eq(artifactTable.recordId, recordId),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (!artifact) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Artifact was not found.",
    })
  }

  return artifact
}
