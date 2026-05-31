import {
  and,
  asc,
  eq,
  inArray,
  lt,
  notExists,
  notInArray,
  sql,
} from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { internRunTable } from "@/features/intern-runs/db"
import { activeInternRunStates } from "@/features/intern-runs/schemas/intern-run-state"
import { projectTable } from "@/features/projects/db"
import { recordTable } from "@/features/records/db"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import type { WorkRecordState } from "@/features/work-records/schemas/work-record-state"
import {
  activeWorkRecordStates,
  claimableWorkRecordStates,
  terminalWorkRecordStates,
} from "@/features/work-records/schemas/work-record-state"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type ClaimWorkRecordCandidateParams =
  | {
      mode: "autopick"
    }
  | {
      mode: "manual"
      projectId: string
      workRecordId: string
    }

type ClaimWorkRecordCandidate = {
  attemptNumber: number
  model: string | null
  projectDefaultTemperature: number
  organizationId: string
  projectId: string
  projectDefaultModel: string
  recordId: string
  state: WorkRecordState
  taskId: string
  workRecordId: string
  temperature: number | null
}

export const claimWorkRecordCandidate = async (
  params: ClaimWorkRecordCandidateParams,
) => {
  return db.transaction(async (tx) => {
    const earlierWorkRecordTable = alias(workRecordTable, "earlier_work_record")
    const earlierTaskTable = alias(taskTable, "earlier_task")
    const activeWorkRecordTable = alias(workRecordTable, "active_work_record")
    const activeInternRunWorkRecordTable = alias(
      workRecordTable,
      "active_intern_run_work_record",
    )
    const maxAttemptNumberByWorkRecord = tx
      .select({
        maxAttemptNumber: sql<number>`max(${internRunTable.attemptNumber})`.as(
          "maxAttemptNumber",
        ),
        workRecordId: internRunTable.workRecordId,
      })
      .from(internRunTable)
      .groupBy(internRunTable.workRecordId)
      .as("max_attempt_number_by_work_record")

    const baseQuery = tx
      .select({
        maxAttemptNumber: maxAttemptNumberByWorkRecord.maxAttemptNumber,
        model: taskTable.model,
        organizationId: projectTable.organizationId,
        projectId: taskTable.projectId,
        projectDefaultModel: projectTable.defaultModel,
        projectDefaultTemperature: projectTable.defaultTemperature,
        recordId: workRecordTable.recordId,
        state: workRecordTable.state,
        taskId: workRecordTable.taskId,
        workRecordId: workRecordTable.id,
        temperature: taskTable.temperature,
      })
      .from(workRecordTable)
      .innerJoin(taskTable, eq(taskTable.id, workRecordTable.taskId))
      .innerJoin(
        recordTable,
        and(
          eq(recordTable.id, workRecordTable.recordId),
          eq(recordTable.state, "active"),
        ),
      )
      .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
      .leftJoin(
        maxAttemptNumberByWorkRecord,
        eq(maxAttemptNumberByWorkRecord.workRecordId, workRecordTable.id),
      )
      .where(
        and(
          params.mode === "manual"
            ? inArray(workRecordTable.state, claimableWorkRecordStates)
            : eq(workRecordTable.state, "waiting"),
          notExists(
            tx
              .select({ id: earlierWorkRecordTable.id })
              .from(earlierWorkRecordTable)
              .innerJoin(
                earlierTaskTable,
                eq(earlierTaskTable.id, earlierWorkRecordTable.taskId),
              )
              .where(
                and(
                  eq(earlierWorkRecordTable.recordId, workRecordTable.recordId),
                  eq(earlierTaskTable.projectId, taskTable.projectId),
                  lt(earlierTaskTable.sortOrder, taskTable.sortOrder),
                  notInArray(
                    earlierWorkRecordTable.state,
                    terminalWorkRecordStates,
                  ),
                ),
              ),
          ),
          notExists(
            tx
              .select({ id: activeWorkRecordTable.id })
              .from(activeWorkRecordTable)
              .where(
                and(
                  eq(activeWorkRecordTable.recordId, workRecordTable.recordId),
                  inArray(activeWorkRecordTable.state, activeWorkRecordStates),
                ),
              ),
          ),
          notExists(
            tx
              .select({ id: internRunTable.id })
              .from(internRunTable)
              .innerJoin(
                activeInternRunWorkRecordTable,
                eq(
                  internRunTable.workRecordId,
                  activeInternRunWorkRecordTable.id,
                ),
              )
              .where(
                and(
                  eq(
                    activeInternRunWorkRecordTable.recordId,
                    workRecordTable.recordId,
                  ),
                  inArray(internRunTable.state, activeInternRunStates),
                ),
              ),
          ),
          params.mode === "manual"
            ? and(
                eq(workRecordTable.id, params.workRecordId),
                eq(taskTable.projectId, params.projectId),
              )
            : eq(projectTable.isAutopickEnabled, true),
        ),
      )
      .for("update", { of: workRecordTable, skipLocked: true })
      .$dynamic()

    const candidateRows =
      params.mode === "autopick"
        ? await baseQuery
            .orderBy(
              asc(taskTable.projectId),
              asc(taskTable.sortOrder),
              asc(workRecordTable.createdAt),
              asc(workRecordTable.id),
            )
            .limit(1)
        : await baseQuery.limit(1)

    const candidate = candidateRows[0] ?? null

    if (!candidate) {
      if (params.mode === "manual") {
        logger.warn(
          { workRecordId: params.workRecordId, mode: params.mode },
          "claimWorkRecordCandidate returned null — work record not claimable",
        )
      }

      return null
    }

    return {
      attemptNumber: (candidate.maxAttemptNumber ?? 0) + 1,
      model: candidate.model,
      organizationId: candidate.organizationId,
      projectId: candidate.projectId,
      projectDefaultModel: candidate.projectDefaultModel,
      projectDefaultTemperature: candidate.projectDefaultTemperature,
      recordId: candidate.recordId,
      state: candidate.state,
      taskId: candidate.taskId,
      workRecordId: candidate.workRecordId,
      temperature: candidate.temperature,
    } satisfies ClaimWorkRecordCandidate
  })
}
