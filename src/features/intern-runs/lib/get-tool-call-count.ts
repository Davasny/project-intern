export const getToolCallCount = (toolSummary: Record<string, unknown>) => {
  const toolCallCount = toolSummary.toolCallCount

  if (typeof toolCallCount === "number" && Number.isFinite(toolCallCount)) {
    return toolCallCount
  }

  const toolCalls = toolSummary.toolCalls

  if (Array.isArray(toolCalls)) {
    return toolCalls.length
  }

  return 0
}
