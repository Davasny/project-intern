import type { TaskFailure } from "@/features/execution/schemas/task-failure"

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const getErrorCode = (error: unknown) => {
  if (isObject(error) && "code" in error && typeof error.code === "string") {
    return error.code
  }

  if (error instanceof Error && error.name.trim().length > 0) {
    return error.name
  }

  return "INTERNAL_SERVER_ERROR"
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  if (
    isObject(error) &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim().length > 0
  ) {
    return error.message
  }

  return "Task execution failed unexpectedly."
}

export const createTaskFailureFromError = (error: unknown): TaskFailure => ({
  code: getErrorCode(error),
  message: getErrorMessage(error),
  retryable: false,
})
