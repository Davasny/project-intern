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

const isRetryableError = (error: unknown) => {
  if (!isObject(error)) return false

  if ("retryable" in error && typeof error.retryable === "boolean") {
    return error.retryable
  }

  if ("code" in error) {
    const code = String(error.code)

    if (
      code === "ECONNREFUSED" ||
      code === "ECONNRESET" ||
      code === "ETIMEDOUT" ||
      code === "ENOTFOUND" ||
      code === "EAI_AGAIN"
    ) {
      return true
    }

    if (code === "UND_ERR_CONNECT_TIMEOUT" || code === "UND_ERR_HEADERS_TIMEOUT") {
      return true
    }

    if (
      code === "57P01" ||
      code === "57P02" ||
      code === "57P03" ||
      code === "08006" ||
      code === "08001" ||
      code === "40001" ||
      code === "40P01"
    ) {
      return true
    }
  }

  return false
}

export const createTaskFailureFromError = (error: unknown): TaskFailure => ({
  code: getErrorCode(error),
  message: getErrorMessage(error),
  retryable: isRetryableError(error),
})
