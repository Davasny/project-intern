import { CodeblockShiki } from "@/components/code-block/code-block-shiki"
import { InternRunHistoryDiffLine } from "@/features/intern-runs/components/intern-run-history-diff-line"
import { getInternRunDiffLineClassName } from "@/features/intern-runs/lib/get-intern-run-diff-line-class-name"
import { getInternRunToolDisplayLanguage } from "@/features/intern-runs/lib/get-intern-run-tool-display-language"

type InternRunHistoryDiffBlockProps = {
  diff: string
  filePath: string | null
}

export const InternRunHistoryDiffBlock = ({
  diff,
  filePath,
}: InternRunHistoryDiffBlockProps) => {
  const lines = diff.split("\n")
  const language = getInternRunToolDisplayLanguage(filePath)
  const lineClassNames = lines.map(getInternRunDiffLineClassName)

  return (
    <div className="w-full min-w-0 max-w-full space-y-2 overflow-hidden">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {filePath ? `Diff · ${filePath}` : "Diff"}
      </span>
      <div className="max-h-[520px] w-full min-w-0 max-w-full overflow-auto rounded-xl border border-border bg-background shadow-sm [scrollbar-width:thin]">
        {language ? (
          <div className="[&_pre]:!m-0 [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!py-3 [&_pre]:text-xs [&_pre]:leading-5">
            <CodeblockShiki
              code={diff}
              fontSize="xs"
              language={language}
              lineClassNames={lineClassNames}
            />
          </div>
        ) : (
          <pre className="py-3 font-mono text-xs leading-5">
            {lines.map((line, index) => (
              <InternRunHistoryDiffLine key={`${index}-${line}`} line={line} />
            ))}
          </pre>
        )}
      </div>
    </div>
  )
}
