type MarkdownViewerProps = {
  value: string
}

export const MarkdownViewer = ({ value }: MarkdownViewerProps) => {
  const seenLines = new Map<string, number>()
  const lines = value.split("\n").map((line) => {
    const seenCount = seenLines.get(line) ?? 0

    seenLines.set(line, seenCount + 1)

    return {
      key: `${line}-${seenCount}`,
      value: line,
    }
  })

  return (
    <div className="text-foreground flex flex-col gap-3 text-sm leading-6">
      {lines.map((line) => {
        if (line.value.startsWith("## ")) {
          return (
            <h3
              className="text-foreground text-lg font-semibold"
              key={line.key}
            >
              {line.value.replace("## ", "")}
            </h3>
          )
        }

        if (line.value.startsWith("# ")) {
          return (
            <h2
              className="text-foreground text-xl font-semibold"
              key={line.key}
            >
              {line.value.replace("# ", "")}
            </h2>
          )
        }

        if (line.value.startsWith("- ")) {
          return (
            <div className="flex flex-row gap-2" key={line.key}>
              <span className="text-muted-foreground">•</span>
              <span>{line.value.replace("- ", "")}</span>
            </div>
          )
        }

        return (
          <p className="whitespace-pre-wrap" key={line.key}>
            {line.value}
          </p>
        )
      })}
    </div>
  )
}
