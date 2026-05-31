export const getInternRunDiffLineClassName = (line: string) => {
  const baseClassName = "block min-h-5 px-4"

  if (line.startsWith("+") && !line.startsWith("+++")) {
    return `${baseClassName} border-l-2 border-emerald-500/70 bg-emerald-500/14`
  }

  if (line.startsWith("-") && !line.startsWith("---")) {
    return `${baseClassName} border-l-2 border-red-500/70 bg-red-500/14`
  }

  if (line.startsWith("@@")) {
    return `${baseClassName} border-l-2 border-sky-500/70 bg-sky-500/12`
  }

  return baseClassName
}
