import type { AgentRunState } from "@/features/agent-runs/schemas/agent-run-state"
import type { TaskRecordState } from "@/features/task-records/schemas/task-record-state"

export type ExecutionTaskRecordCell = {
  attemptCount: number
  latestAgentRun: {
    id: string
    state: AgentRunState
  } | null
  recordId: string
  recordName: string
  state: TaskRecordState
  taskId: string
  taskRecordId: string
  taskSortOrder: number
  taskTitle: string
}

type ExecutionMatrixTask = {
  id: string
  sortOrder: number
  title: string
}

type ExecutionMatrixRecord = {
  id: string
  name: string
}

export const buildExecutionMatrix = (
  taskRecords: Array<ExecutionTaskRecordCell>,
) => {
  const tasksById = new Map<string, ExecutionMatrixTask>()
  const recordsById = new Map<string, ExecutionMatrixRecord>()
  const taskRecordsByRecordId = new Map<
    string,
    Map<string, ExecutionTaskRecordCell>
  >()

  for (const taskRecord of taskRecords) {
    if (!tasksById.has(taskRecord.taskId)) {
      tasksById.set(taskRecord.taskId, {
        id: taskRecord.taskId,
        sortOrder: taskRecord.taskSortOrder,
        title: taskRecord.taskTitle,
      })
    }

    if (!recordsById.has(taskRecord.recordId)) {
      recordsById.set(taskRecord.recordId, {
        id: taskRecord.recordId,
        name: taskRecord.recordName,
      })
    }

    const recordCells = taskRecordsByRecordId.get(taskRecord.recordId)

    if (recordCells) {
      recordCells.set(taskRecord.taskId, taskRecord)
      continue
    }

    taskRecordsByRecordId.set(
      taskRecord.recordId,
      new Map([[taskRecord.taskId, taskRecord]]),
    )
  }

  const tasks = Array.from(tasksById.values()).sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder
    }

    if (left.title !== right.title) {
      return left.title.localeCompare(right.title)
    }

    return left.id.localeCompare(right.id)
  })

  const records = Array.from(recordsById.values()).sort((left, right) => {
    const leftName = left.name.toLocaleLowerCase()
    const rightName = right.name.toLocaleLowerCase()

    if (leftName !== rightName) {
      return leftName.localeCompare(rightName)
    }

    return left.id.localeCompare(right.id)
  })

  return {
    records,
    taskRecordsByRecordId,
    tasks,
  }
}
