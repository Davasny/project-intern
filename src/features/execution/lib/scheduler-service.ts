import { and, asc, eq, inArray, notExists, sql } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"

import { db } from "@/lib/db"

export const schedulerService = async () =>
  db
    .select({
      projectId: taskTable.projectId,
      recordId: taskRecordTable.recordId,
      taskId: taskRecordTable.taskId,
      taskRecordId: taskRecordTable.id,
    })
    .from(taskRecordTable)
    .innerJoin(taskTable, eq(taskRecordTable.taskId, taskTable.id))
    .where(
      and(
        inArray(taskRecordTable.state, ["failed", "waiting"]),
        notExists(
          db
            .select({ id: agentRunTable.id })
            .from(agentRunTable)
            .where(
              and(
                eq(agentRunTable.taskRecordId, taskRecordTable.id),
                inArray(agentRunTable.state, [
                  "booting",
                  "persisting_outputs",
                  "running",
                ]),
              ),
            ),
        ),
      ),
    )
    .orderBy(asc(taskTable.sortOrder), asc(sql`${taskRecordTable.createdAt}`))
    .limit(1)
    .then((rows) => rows[0] ?? null)
