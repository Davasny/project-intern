import { TRPCError } from "@trpc/server"
import { desc, eq } from "drizzle-orm"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordTable } from "@/features/records/db"
import { db } from "@/lib/db"

type ListRecordsParams = {
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const listRecords = async ({
  organizationSlug,
  projectSlug,
  userId,
}: ListRecordsParams) => {
  const project = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project.",
    })
  }

  return db
    .select({
      context: recordTable.context,
      createdAt: recordTable.createdAt,
      id: recordTable.id,
      name: recordTable.name,
      schemaVersion: recordTable.schemaVersion,
      state: recordTable.state,
      updatedAt: recordTable.updatedAt,
      version: recordTable.version,
    })
    .from(recordTable)
    .where(eq(recordTable.projectId, project.id))
    .orderBy(desc(recordTable.updatedAt))
}
