const maxTooltipLength = 240

const getPayloadField = (payload: Record<string, unknown>, key: string) => {
  const value = payload[key]

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null
}

const truncateTooltipText = (text: string) => {
  if (text.length <= maxTooltipLength) {
    return text
  }

  return `${text.slice(0, maxTooltipLength - 1)}…`
}

export const getInternRunStatusTooltipText = ({
  failurePayload,
  resultPayload,
}: {
  failurePayload: Record<string, unknown> | null
  resultPayload: Record<string, unknown> | null
}) => {
  const summaryText =
    (resultPayload ? getPayloadField(resultPayload, "summary") : null) ??
    (failurePayload ? getPayloadField(failurePayload, "summary") : null)

  if (summaryText) {
    return truncateTooltipText(summaryText)
  }

  const payload = failurePayload ?? resultPayload

  if (!payload || Object.keys(payload).length === 0) {
    return null
  }

  const text =
    getPayloadField(payload, "reason") ??
    getPayloadField(payload, "message") ??
    getPayloadField(payload, "error") ??
    JSON.stringify(payload)

  return truncateTooltipText(text)
}
