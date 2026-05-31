import { ExternalLinkIcon } from "lucide-react"

type InternRunHistoryUrlBlockProps = {
  url: string
}

export const InternRunHistoryUrlBlock = ({
  url,
}: InternRunHistoryUrlBlockProps) => (
  <div className="w-full min-w-0 max-w-full space-y-2 overflow-hidden">
    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      URL
    </span>
    <a
      className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-muted/60 p-4 text-xs font-medium leading-5 text-foreground underline-offset-4 transition hover:bg-muted hover:underline"
      href={url}
      rel="noreferrer"
      target="_blank"
    >
      <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{url}</span>
    </a>
  </div>
)
