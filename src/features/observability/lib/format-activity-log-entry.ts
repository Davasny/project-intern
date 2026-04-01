type ActivityLogEntry = {
  createdAt: Date
  eventType: string
  payload: Record<string, unknown>
  recordName: string | null
  taskTitle: string | null
}

const getStringValue = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : null

export const formatActivityLogEntry = ({
  eventType,
  payload,
  recordName,
  taskTitle,
}: ActivityLogEntry) => {
  if (eventType === "schema.version_created") {
    return {
      description: `Schema version ${String(payload.version ?? "")}`,
      label: "Schema version created",
    }
  }

  if (eventType === "schema.migration_finalized") {
    return {
      description: `${getStringValue(payload.title) ?? taskTitle ?? "Migration task"} finished for all records.`,
      label: "Schema migration finalized",
    }
  }

  if (eventType === "task.created") {
    return {
      description: `${getStringValue(payload.title) ?? taskTitle ?? "Task"} entered the project queue.`,
      label: "Task created",
    }
  }

  if (eventType === "taskRecord.claimed") {
    return {
      description: `${taskTitle ?? "Task"} started for ${recordName ?? "a record"}.`,
      label: "Task record claimed",
    }
  }

  if (eventType === "taskRecord.completed") {
    return {
      description: `${taskTitle ?? "Task"} completed for ${recordName ?? "a record"}.`,
      label: "Task record completed",
    }
  }

  if (eventType === "taskRecord.failed") {
    return {
      description: `${taskTitle ?? "Task"} failed for ${recordName ?? "a record"}.`,
      label: "Task record failed",
    }
  }

  if (eventType === "agentRun.started") {
    return {
      description: `${taskTitle ?? "Task"} booted with ${getStringValue(payload.model) ?? "a runtime model"}.`,
      label: "Agent run started",
    }
  }

  if (eventType === "agentRun.completed") {
    return {
      description: `${taskTitle ?? "Task"} finished successfully for ${recordName ?? "a record"}.`,
      label: "Agent run completed",
    }
  }

  if (eventType === "agentRun.failed") {
    return {
      description: `${taskTitle ?? "Task"} failed with ${getStringValue(payload.errorCode) ?? "an error"}.`,
      label: "Agent run failed",
    }
  }

  if (eventType === "record.patch_applied") {
    return {
      description: `${recordName ?? "Record"} accepted ${String(payload.changeCount ?? 0)} validated changes.`,
      label: "Record patch applied",
    }
  }

  return {
    description: JSON.stringify(payload),
    label: eventType,
  }
}
