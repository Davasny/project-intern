type InternRunOutcomeDetailsParams = {
  failurePayload: Record<string, unknown> | null
  resultPayload: Record<string, unknown> | null
}

type InternRunOutcomeDetails = {
  errorCode: string | null
  label: "Reason" | "Summary"
  text: string
  title: string
}

const getStringField = ({
  field,
  payload,
}: {
  field: string
  payload: Record<string, unknown> | null
}) => {
  const value = payload?.[field]

  return typeof value === "string" && value.trim().length > 0 ? value : null
}

const getBooleanField = ({
  field,
  payload,
}: {
  field: string
  payload: Record<string, unknown> | null
}) => {
  const value = payload?.[field]

  return typeof value === "boolean" ? value : null
}

const humanizeValue = (value: string) =>
  value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const getConclusionType = (payload: Record<string, unknown> | null) => {
  const conclusionType = getStringField({ field: "conclusionType", payload })

  if (conclusionType !== null) {
    return conclusionType
  }

  const conclusionTypeSnakeCase = getStringField({
    field: "conclusion_type",
    payload,
  })

  if (conclusionTypeSnakeCase !== null) {
    return conclusionTypeSnakeCase
  }

  return getStringField({ field: "outcome", payload })
}

const getOutcomeTitle = ({
  fallbackTitle,
  payload,
}: {
  fallbackTitle: string
  payload: Record<string, unknown> | null
}) => {
  const conclusionType = getConclusionType(payload)
  const found = getBooleanField({ field: "found", payload })
  const titleParts = [
    conclusionType !== null ? humanizeValue(conclusionType) : fallbackTitle,
  ]

  if (found !== null) {
    titleParts.push(found ? "Found" : "Not Found")
  }

  return titleParts.join(" · ")
}

export const getInternRunOutcomeDetails = ({
  failurePayload,
  resultPayload,
}: InternRunOutcomeDetailsParams): InternRunOutcomeDetails | null => {
  const failureReason = getStringField({
    field: "reason",
    payload: failurePayload,
  })

  if (failureReason !== null) {
    return {
      errorCode: getStringField({ field: "code", payload: failurePayload }),
      label: "Reason",
      text: failureReason,
      title: getOutcomeTitle({
        fallbackTitle: "Failure",
        payload: failurePayload,
      }),
    }
  }

  const resultSummary = getStringField({
    field: "summary",
    payload: resultPayload,
  })

  if (resultSummary !== null) {
    return {
      errorCode: null,
      label: "Summary",
      text: resultSummary,
      title: getOutcomeTitle({
        fallbackTitle: "Summary",
        payload: resultPayload,
      }),
    }
  }

  const resultReason = getStringField({
    field: "reason",
    payload: resultPayload,
  })

  if (resultReason !== null) {
    return {
      errorCode: null,
      label: "Reason",
      text: resultReason,
      title: getOutcomeTitle({
        fallbackTitle: "Reason",
        payload: resultPayload,
      }),
    }
  }

  return null
}
