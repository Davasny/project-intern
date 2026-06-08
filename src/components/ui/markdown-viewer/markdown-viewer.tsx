type MarkdownViewerProps = {
  value: string
}

const renderInlineMarkdown = (value: string) =>
  value.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong className="font-semibold" key={`${part}-${index}`}>
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  )

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
        if (line.value.startsWith("### ")) {
          return (
            <h4
              className="text-foreground text-base font-semibold"
              key={line.key}
            >
              {renderInlineMarkdown(line.value.replace("### ", ""))}
            </h4>
          )
        }

        if (line.value.startsWith("## ")) {
          return (
            <h3
              className="text-foreground text-lg font-semibold"
              key={line.key}
            >
              {renderInlineMarkdown(line.value.replace("## ", ""))}
            </h3>
          )
        }

        if (line.value.startsWith("# ")) {
          return (
            <h2
              className="text-foreground text-xl font-semibold"
              key={line.key}
            >
              {renderInlineMarkdown(line.value.replace("# ", ""))}
            </h2>
          )
        }

        if (line.value.startsWith("- ")) {
          return (
            <div className="flex flex-row gap-2" key={line.key}>
              <span className="text-muted-foreground">•</span>
              <span>{renderInlineMarkdown(line.value.replace("- ", ""))}</span>
            </div>
          )
        }

        return (
          <p className="whitespace-pre-wrap" key={line.key}>
            {renderInlineMarkdown(line.value)}
          </p>
        )
      })}
    </div>
  )
}
