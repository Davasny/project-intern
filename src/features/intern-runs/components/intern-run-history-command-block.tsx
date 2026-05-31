type InternRunHistoryCommandBlockProps = {
  command: string
}

export const InternRunHistoryCommandBlock = ({
  command,
}: InternRunHistoryCommandBlockProps) => (
  <div className="w-full min-w-0 max-w-full space-y-2 overflow-hidden">
    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      Command
    </span>
    <pre className="max-h-64 w-full min-w-0 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-border bg-muted/60 p-4 font-mono text-xs leading-5 text-foreground [scrollbar-width:thin]">
      {command}
    </pre>
  </div>
)
