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
import { agentRunTable } from "@/features/agent-runs/db"
import { activeAgentRunStates } from "@/features/agent-runs/schemas/agent-run-state"
import { projectTable } from "@/features/projects/db"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import type { TaskRecordState } from "@/features/task-records/schemas/task-record-state"
import {
  activeTaskRecordStates,
  claimableTaskRecordStates,
  terminalTaskRecordStates,
} from "@/features/task-records/schemas/task-record-state"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type ClaimTaskRecordCandidateParams =
  | {
      mode: "autopick"
    }
  | {
      mode: "manual"
      projectId: string
      taskRecordId: string
    }

type ClaimTaskRecordCandidate = {
  attemptNumber: number
  model: string | null
  projectDefaultTemperature: number
  organizationId: string
  projectId: string
  projectDefaultModel: string
  recordId: string
  state: TaskRecordState
  taskId: string
  taskRecordId: string
  temperature: number | null
}

export const claimTaskRecordCandidate = async (
  params: ClaimTaskRecordCandidateParams,
) => {
  return db.transaction(async (tx) => {
    const earlierTaskRecordTable = alias(taskRecordTable, "earlier_task_record")
    const earlierTaskTable = alias(taskTable, "earlier_task")
    const activeTaskRecordTable = alias(taskRecordTable, "active_task_record")
    const activeAgentRunTaskRecordTable = alias(
      taskRecordTable,
      "active_agent_run_task_record",
    )
    const maxAttemptNumberByTaskRecord = tx
      .select({
        maxAttemptNumber: sql<number>`max(${agentRunTable.attemptNumber})`.as(
          "maxAttemptNumber",
        ),
        taskRecordId: agentRunTable.taskRecordId,
      })
      .from(agentRunTable)
      .groupBy(agentRunTable.taskRecordId)
      .as("max_attempt_number_by_task_record")

    const baseQuery = tx
      .select({
        maxAttemptNumber: maxAttemptNumberByTaskRecord.maxAttemptNumber,
        model: taskTable.model,
        organizationId: projectTable.organizationId,
        projectId: taskTable.projectId,
        projectDefaultModel: projectTable.defaultModel,
        projectDefaultTemperature: projectTable.defaultTemperature,
        recordId: taskRecordTable.recordId,
        state: taskRecordTable.state,
        taskId: taskRecordTable.taskId,
        taskRecordId: taskRecordTable.id,
        temperature: taskTable.temperature,
      })
      .from(taskRecordTable)
      .innerJoin(taskTable, eq(taskTable.id, taskRecordTable.taskId))
      .innerJoin(
        recordTable,
        and(
          eq(recordTable.id, taskRecordTable.recordId),
          eq(recordTable.state, "active"),
        ),
      )
      .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
      .leftJoin(
        maxAttemptNumberByTaskRecord,
        eq(maxAttemptNumberByTaskRecord.taskRecordId, taskRecordTable.id),
      )
      .where(
        and(
          params.mode === "manual"
            ? inArray(taskRecordTable.state, claimableTaskRecordStates)
            : eq(taskRecordTable.state, "waiting"),
          notExists(
            tx
              .select({ id: earlierTaskRecordTable.id })
              .from(earlierTaskRecordTable)
              .innerJoin(
                earlierTaskTable,
                eq(earlierTaskTable.id, earlierTaskRecordTable.taskId),
              )
              .where(
                and(
                  eq(earlierTaskRecordTable.recordId, taskRecordTable.recordId),
                  eq(earlierTaskTable.projectId, taskTable.projectId),
                  lt(earlierTaskTable.sortOrder, taskTable.sortOrder),
                  notInArray(
                    earlierTaskRecordTable.state,
                    terminalTaskRecordStates,
                  ),
                ),
              ),
          ),
          notExists(
            tx
              .select({ id: activeTaskRecordTable.id })
              .from(activeTaskRecordTable)
              .where(
                and(
                  eq(activeTaskRecordTable.recordId, taskRecordTable.recordId),
                  inArray(activeTaskRecordTable.state, activeTaskRecordStates),
                ),
              ),
          ),
          notExists(
            tx
              .select({ id: agentRunTable.id })
              .from(agentRunTable)
              .innerJoin(
                activeAgentRunTaskRecordTable,
                eq(
                  agentRunTable.taskRecordId,
                  activeAgentRunTaskRecordTable.id,
                ),
              )
              .where(
                and(
                  eq(
                    activeAgentRunTaskRecordTable.recordId,
                    taskRecordTable.recordId,
                  ),
                  inArray(agentRunTable.state, activeAgentRunStates),
                ),
              ),
          ),
          params.mode === "manual"
            ? and(
                eq(taskRecordTable.id, params.taskRecordId),
                eq(taskTable.projectId, params.projectId),
              )
            : eq(projectTable.isAutopickEnabled, true),
        ),
      )
      .for("update", { of: taskRecordTable, skipLocked: true })
      .$dynamic()

    const candidateRows =
      params.mode === "autopick"
        ? await baseQuery
            .orderBy(
              asc(taskTable.projectId),
              asc(taskTable.sortOrder),
              asc(taskRecordTable.createdAt),
              asc(taskRecordTable.id),
            )
            .limit(1)
        : await baseQuery.limit(1)

    const candidate = candidateRows[0] ?? null

    if (!candidate) {
      if (params.mode === "manual") {
        logger.warn(
          { taskRecordId: params.taskRecordId, mode: params.mode },
          "claimTaskRecordCandidate returned null — task record not claimable",
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
      taskRecordId: candidate.taskRecordId,
      temperature: candidate.temperature,
    } satisfies ClaimTaskRecordCandidate
  })
}
