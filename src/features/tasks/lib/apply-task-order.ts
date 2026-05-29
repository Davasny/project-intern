import { and, eq, inArray, sql } from "drizzle-orm"
import { taskTable } from "@/features/tasks/db"
import type { db } from "@/lib/db"

type ApplyTaskOrderParams = {
  database: typeof db
  orderedTaskIds: string[]
  projectId: string
}

export const applyTaskOrder = async ({
  database,
  orderedTaskIds,
  projectId,
}: ApplyTaskOrderParams) => {
  await database.transaction(async (tx) => {
    await tx
      .update(taskTable)
      .set({
        sortOrder: sql`${taskTable.sortOrder} + ${orderedTaskIds.length + 10}`,
      })
      .where(
        and(
          eq(taskTable.projectId, projectId),
          inArray(taskTable.id, orderedTaskIds),
        ),
      )

    for (const [index, taskId] of orderedTaskIds.entries()) {
      await tx
        .update(taskTable)
        .set({ sortOrder: index + 1 })
        .where(
          and(eq(taskTable.id, taskId), eq(taskTable.projectId, projectId)),
        )
    }
  })
}
