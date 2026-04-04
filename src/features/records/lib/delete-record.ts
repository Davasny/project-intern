import { TRPCError } from "@trpc/server"
import { and, eq, inArray } from "drizzle-orm"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordTable } from "@/features/records/db"
import { getScopedRecord } from "@/features/records/lib/get-scoped-record"
import { taskRecordTable } from "@/features/task-records/db"
import { activeTaskRecordStates } from "@/features/task-records/schemas/task-record-state"
import { db } from "@/lib/db"
import { cleanupRecordDirectories } from "@/lib/utils/cleanup-record-directories"

type DeleteRecordParams = {
  organizationSlug: string
  projectSlug: string
  recordId: string
  userId: string
}

export const deleteRecord = async ({
  organizationSlug,
  projectSlug,
  recordId,
  userId,
}: DeleteRecordParams) => {
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

  const record = await getScopedRecord({
    projectId: project.id,
    recordId,
  })

  const activeTaskRecords = await db
    .select({ id: taskRecordTable.id })
    .from(taskRecordTable)
    .where(
      and(
        eq(taskRecordTable.recordId, record.id),
        inArray(taskRecordTable.state, activeTaskRecordStates),
      ),
    )

  if (activeTaskRecords.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Cannot delete a record with active task executions. Wait for them to finish first.",
    })
  }

  const deletedRows = await db
    .delete(recordTable)
    .where(
      and(eq(recordTable.id, record.id), eq(recordTable.projectId, project.id)),
    )

  if (!deletedRows) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Record was not found.",
    })
  }

  await cleanupRecordDirectories({
    organizationId: project.organizationId,
    projectId: project.id,
    recordId: record.id,
  })

  return { id: record.id }
}
