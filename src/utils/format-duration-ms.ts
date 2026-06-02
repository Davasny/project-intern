const emptyDuration = "—"

const padDurationSegment = (value: number) => value.toString().padStart(2, "0")

export const formatDurationMs = (value: number | null) => {
  if (value === null || !Number.isFinite(value) || value < 0) {
    return emptyDuration
  }

  const totalSeconds = Math.round(value / 1000)
  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)

  if (hours > 0) {
    return `${hours}:${padDurationSegment(minutes)}:${padDurationSegment(seconds)}h`
  }

  if (totalMinutes > 0) {
    return `${totalMinutes}:${padDurationSegment(seconds)}m`
  }

  return `${seconds}s`
}
