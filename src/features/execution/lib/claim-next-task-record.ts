import { sql } from "drizzle-orm"
import type { AgentRunState } from "@/features/agent-runs/schemas/agent-run-state"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import type { TaskRecordState } from "@/features/task-records/schemas/task-record-state"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

const activeAgentRunStates = [
  "created",
  "booting",
  "running",
  "persisting_outputs",
] satisfies Array<AgentRunState>

const terminalTaskRecordStates = [
  "completed",
  "skipped",
] satisfies Array<TaskRecordState>

type ClaimedTaskRecordRow = {
  agentRunId: string
  organizationId: string
  projectId: string
  recordId: string
  taskId: string
  taskRecordId: string
}

const createPgArray = (values: string[]) =>
  sql.raw(`ARRAY[${values.map((value) => `'${value}'`).join(", ")}]`)

export const claimNextTaskRecord = async () => {
  try {
    const claimedTaskRecord = await db.transaction(async (tx) => {
      const claimResult = await tx.execute<ClaimedTaskRecordRow>(sql`
        with candidate as (
          select
            tr.id as task_record_id,
            tr.task_id,
            tr.record_id,
            t.project_id,
            p.organization_id
          from task_record tr
          inner join task t on t.id = tr.task_id
          inner join project p on p.id = t.project_id
          where
            tr.state = 'waiting'
            and p.is_autopick_enabled = true
            and not exists (
              select 1
              from task_record earlier_tr
              inner join task earlier_t on earlier_t.id = earlier_tr.task_id
              where
                earlier_tr.record_id = tr.record_id
                and earlier_t.project_id = t.project_id
                and earlier_t.sort_order < t.sort_order
                and earlier_tr.state <> all(${createPgArray(terminalTaskRecordStates)})
            )
            and not exists (
              select 1
              from task_record active_tr
              where
                active_tr.record_id = tr.record_id
                and active_tr.state in ('picked_up', 'in_progress')
            )
            and not exists (
              select 1
              from agent_run active_ar
              inner join task_record active_ar_tr on active_ar_tr.id = active_ar.task_record_id
              where
                active_ar_tr.record_id = tr.record_id
                and active_ar.state = any(${createPgArray(activeAgentRunStates)})
            )
          order by t.project_id asc, t.sort_order asc, tr.created_at asc, tr.id asc
          limit 1
          for update of tr skip locked
        ),
        inserted_agent_run as (
          insert into agent_run (
            task_record_id,
            attempt_number,
            state,
            selected_model,
            selected_agent,
            session_reference,
            provider,
            model,
            started_at,
            finished_at,
            latency_ms,
            token_input,
            token_output,
            input_tokens,
            output_tokens,
            cost_usd,
            estimated_cost_usd,
            tool_call_count,
            tool_activity_summary,
            tool_summary,
            result_payload,
            failure_payload
          )
          select
            candidate.task_record_id,
            coalesce(max(existing_ar.attempt_number), 0) + 1,
            'created',
            t.model,
            'record-worker',
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            0,
            '{}'::jsonb,
            '{}'::jsonb,
            null,
            null
          from candidate
          inner join task t on t.id = candidate.task_id
          left join agent_run existing_ar on existing_ar.task_record_id = candidate.task_record_id
          group by candidate.task_record_id, t.model
          returning id, task_record_id
        ),
        updated_task_record as (
          update task_record tr
          set
            state = 'picked_up',
            agent_run_id = inserted_agent_run.id,
            error_code = null,
            last_transition_at = now(),
            updated_at = now()
          from inserted_agent_run
          where
            tr.id = inserted_agent_run.task_record_id
            and tr.state = 'waiting'
          returning tr.id, tr.task_id, tr.record_id
        )
        select
          inserted_agent_run.id as "agentRunId",
          candidate.organization_id as "organizationId",
          candidate.project_id as "projectId",
          updated_task_record.record_id as "recordId",
          updated_task_record.task_id as "taskId",
          updated_task_record.id as "taskRecordId"
        from updated_task_record
        inner join candidate on candidate.task_record_id = updated_task_record.id
        inner join inserted_agent_run on inserted_agent_run.task_record_id = updated_task_record.id
      `)

      return claimResult.rows[0] ?? null
    })

    if (!claimedTaskRecord) {
      return null
    }

    await createActivityLogEvent({
      actorId: claimedTaskRecord.agentRunId,
      actorType: "executor",
      agentRunId: claimedTaskRecord.agentRunId,
      database: db,
      entityId: claimedTaskRecord.taskRecordId,
      entityType: "taskRecord",
      eventType: "taskRecord.claimed",
      organizationId: claimedTaskRecord.organizationId,
      payload: {
        recordId: claimedTaskRecord.recordId,
        taskId: claimedTaskRecord.taskId,
      },
      projectId: claimedTaskRecord.projectId,
      recordId: claimedTaskRecord.recordId,
      relatedProjectId: null,
      relatedRecordId: null,
      taskId: claimedTaskRecord.taskId,
      taskRecordId: claimedTaskRecord.taskRecordId,
    })

    logger.info(claimedTaskRecord, "Claimed next task record")

    return claimedTaskRecord
  } catch (error) {
    const databaseError = error as { code?: string }

    if (databaseError.code === "23505") {
      logger.warn({ error }, "Skipped conflicting task record claim")
      return null
    }

    throw error
  }
}
