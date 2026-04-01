type JsonViewerProps = {
  value: Record<string, unknown>
}

export const JsonViewer = ({ value }: JsonViewerProps) => (
  <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
    {JSON.stringify(value, null, 2)}
  </pre>
)
