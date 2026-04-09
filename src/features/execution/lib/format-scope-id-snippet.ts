export const formatScopeIdSnippet = (value: string) => {
  if (value.length <= 10) {
    return value
  }

  const start = value.slice(0, 6)
  const end = value.slice(-4)

  return `${start}…${end}`
}
