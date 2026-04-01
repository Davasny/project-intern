export const createMcpJsonResponse = (payload: {
  data?: unknown
  error?: {
    message: string
  }
  ok: boolean
}) => {
  const content: {
    text: string
    type: "text"
  } = {
    text: JSON.stringify(payload, null, 2),
    type: "text",
  }

  return {
    content: [content],
    structuredContent: payload,
  }
}
