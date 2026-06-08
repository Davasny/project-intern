import type { InternRunState } from "@/features/intern-runs/schemas/intern-run-state"
import {
  isTerminalWorkRecordState,
  type WorkRecordState,
} from "@/features/work-records/schemas/work-record-state"

export type ExecutionWorkRecordBlocker = {
  state: WorkRecordState
  taskTitle: string
}

type ExecutionWorkRecordMatrixInput = {
  attemptCount: number
  latestInternRun: {
    id: string
    state: InternRunState
    statusTooltipText: string | null
  } | null
  recordId: string
  recordName: string
  state: WorkRecordState
  taskId: string
  workRecordId: string
  taskSortOrder: number
  taskTitle: string
}

export type ExecutionWorkRecordCell = {
  attemptCount: number
  blocker: ExecutionWorkRecordBlocker | null
  latestInternRun: {
    id: string
    state: InternRunState
    statusTooltipText: string | null
  } | null
  recordId: string
  recordName: string
  state: WorkRecordState
  taskId: string
  workRecordId: string
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

type BuildExecutionMatrixParams = {
  records: Array<ExecutionMatrixRecord>
  tasks: Array<ExecutionMatrixTask>
  workRecords: Array<ExecutionWorkRecordMatrixInput>
}

export const buildExecutionMatrix = ({
  records,
  tasks,
  workRecords,
}: BuildExecutionMatrixParams) => {
  const rawWorkRecordsByRecordId = new Map<
    string,
    Map<string, ExecutionWorkRecordMatrixInput>
  >()

  for (const workRecord of workRecords) {
    const recordCells = rawWorkRecordsByRecordId.get(workRecord.recordId)

    if (recordCells) {
      recordCells.set(workRecord.taskId, workRecord)
      continue
    }

    rawWorkRecordsByRecordId.set(
      workRecord.recordId,
      new Map([[workRecord.taskId, workRecord]]),
    )
  }

  const sortedTasks = [...tasks].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder
    }

    if (left.title !== right.title) {
      return left.title.localeCompare(right.title)
    }

    return left.id.localeCompare(right.id)
  })

  const sortedRecords = [...records].sort((left, right) => {
    const leftName = left.name.toLocaleLowerCase()
    const rightName = right.name.toLocaleLowerCase()

    if (leftName !== rightName) {
      return leftName.localeCompare(rightName)
    }

    return left.id.localeCompare(right.id)
  })

  const workRecordsByRecordId = new Map<
    string,
    Map<string, ExecutionWorkRecordCell>
  >()

  for (const record of sortedRecords) {
    const rawRecordCells = rawWorkRecordsByRecordId.get(record.id)

    if (!rawRecordCells) {
      continue
    }

    const recordCells = new Map<string, ExecutionWorkRecordCell>()
    let blocker: ExecutionWorkRecordBlocker | null = null

    for (const task of sortedTasks) {
      const workRecord = rawRecordCells.get(task.id)

      if (!workRecord) {
        continue
      }

      recordCells.set(task.id, {
        ...workRecord,
        blocker,
      })

      if (!blocker && !isTerminalWorkRecordState(workRecord.state)) {
        blocker = {
          state: workRecord.state,
          taskTitle: workRecord.taskTitle,
        }
      }
    }

    workRecordsByRecordId.set(record.id, recordCells)
  }

  return {
    records: sortedRecords,
    workRecordsByRecordId,
    tasks: sortedTasks,
  }
}
