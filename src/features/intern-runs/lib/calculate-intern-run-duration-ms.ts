export const calculateInternRunDurationMs = ({
  finishedAt,
  latencyMs,
  startedAt,
}: {
  finishedAt: Date | null
  latencyMs: number | null
  startedAt: Date | null
}) => {
  if (startedAt !== null && finishedAt !== null) {
    const durationMs = finishedAt.getTime() - startedAt.getTime()

    return durationMs >= 0 ? durationMs : null
  }

  return latencyMs
}
