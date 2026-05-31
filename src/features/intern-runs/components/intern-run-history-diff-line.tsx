import { getInternRunDiffLineClassName } from "@/features/intern-runs/lib/get-intern-run-diff-line-class-name"
import { cn } from "@/lib/utils"

type InternRunHistoryDiffLineProps = {
  line: string
}

const getLineToneClassName = (line: string) => {
  if (line.startsWith("+") && !line.startsWith("+++")) {
    return "text-emerald-700 dark:text-emerald-300"
  }

  if (line.startsWith("-") && !line.startsWith("---")) {
    return "text-red-700 dark:text-red-300"
  }

  if (line.startsWith("@@")) {
    return "text-sky-700 dark:text-sky-300"
  }

  return "text-foreground"
}

export const InternRunHistoryDiffLine = ({
  line,
}: InternRunHistoryDiffLineProps) => (
  <span className={cn(getInternRunDiffLineClassName(line), getLineToneClassName(line))}>
    {line.length > 0 ? line : " "}
  </span>
)
