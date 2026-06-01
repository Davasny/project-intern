import type { InternRunState } from "@/features/intern-runs/schemas/intern-run-state"
import type { WorkRecordState } from "@/features/work-records/schemas/work-record-state"

export type ExecutionWorkRecordCell = {
  attemptCount: number
  latestInternRun: {
    id: string
    state: InternRunState
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
  workRecords: Array<ExecutionWorkRecordCell>
}

export const buildExecutionMatrix = ({
  records,
  tasks,
  workRecords,
}: BuildExecutionMatrixParams) => {
  const workRecordsByRecordId = new Map<
    string,
    Map<string, ExecutionWorkRecordCell>
  >()

  for (const workRecord of workRecords) {
    const recordCells = workRecordsByRecordId.get(workRecord.recordId)

    if (recordCells) {
      recordCells.set(workRecord.taskId, workRecord)
      continue
    }

    workRecordsByRecordId.set(
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

  return {
    records: sortedRecords,
    workRecordsByRecordId,
    tasks: sortedTasks,
  }
}
