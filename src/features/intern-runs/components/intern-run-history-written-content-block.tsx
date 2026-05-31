import { CodeblockShiki } from "@/components/code-block/code-block-shiki"
import { getInternRunToolDisplayLanguage } from "@/features/intern-runs/lib/get-intern-run-tool-display-language"

type InternRunHistoryWrittenContentBlockProps = {
  content: string
  filePath: string
}

export const InternRunHistoryWrittenContentBlock = ({
  content,
  filePath,
}: InternRunHistoryWrittenContentBlockProps) => {
  const language = getInternRunToolDisplayLanguage(filePath)

  return (
    <div className="w-full min-w-0 max-w-full space-y-2 overflow-hidden">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {filePath}
      </span>
      <div className="max-h-[520px] w-full min-w-0 max-w-full overflow-auto rounded-xl border border-border bg-muted/60 [scrollbar-width:thin] [&_pre]:!m-0 [&_pre]:!bg-transparent [&_pre]:!p-4 [&_pre]:text-xs [&_pre]:leading-5">
        {language ? (
          <CodeblockShiki code={content} fontSize="xs" language={language} />
        ) : (
          <pre className="whitespace-pre-wrap break-all p-4 font-mono text-xs leading-5 text-foreground">
            {content}
          </pre>
        )}
      </div>
    </div>
  )
}
