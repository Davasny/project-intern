import { JsonViewer } from "@/components/ui/json-viewer/json-viewer"
import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import type { AgentRunSessionMessagePart } from "@/features/agent-runs/lib/get-agent-run-session-messages"

type AgentRunMessagePartItemProps = {
  part: AgentRunSessionMessagePart
}

const toolStateTone = {
  completed: "success",
  error: "danger",
  pending: "warning",
  running: "info",
} as const

export const AgentRunMessagePartItem = ({
  part,
}: AgentRunMessagePartItemProps) => {
  if (part.type === "text") {
    return (
      <div className="flex flex-col gap-2">
        <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
          {part.text}
        </pre>
        {part.synthetic || part.ignored ? (
          <div className="flex flex-wrap gap-2">
            {part.synthetic ? (
              <StatusBadge label="Synthetic" tone="warning" />
            ) : null}
            {part.ignored ? (
              <StatusBadge label="Ignored" tone="warning" />
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  if (part.type === "reasoning") {
    return (
      <details className="flex flex-col gap-3 rounded-2xl border border-violet-200 bg-violet-50/80 p-4">
        <summary className="cursor-pointer text-sm font-medium text-violet-900">
          Reasoning
        </summary>
        <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
          {part.text}
        </pre>
      </details>
    )
  }

  if (part.type === "tool") {
    return (
      <details className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
          <span className="font-medium text-slate-900">{part.tool}</span>
          <StatusBadge label={part.status} tone={toolStateTone[part.status]} />
          {part.title ? (
            <span className="text-sm text-slate-500">{part.title}</span>
          ) : null}
        </summary>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Call ID
            </span>
            <code className="break-all rounded-lg bg-white px-3 py-2 text-xs text-slate-700">
              {part.callId}
            </code>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Input
            </span>
            <JsonViewer value={part.input} />
          </div>
          {part.metadata ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Metadata
              </span>
              <JsonViewer value={part.metadata} />
            </div>
          ) : null}
          {part.output ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Output
              </span>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
                {part.output}
              </pre>
            </div>
          ) : null}
          {part.error ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Error
              </span>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-red-950 p-4 text-xs text-red-100">
                {part.error}
              </pre>
            </div>
          ) : null}
          {part.attachments.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Attachments
              </span>
              <div className="flex flex-col gap-2">
                {part.attachments.map((attachment) => (
                  <div
                    key={attachment.url}
                    className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-3"
                  >
                    <span className="text-sm font-medium text-slate-900">
                      {attachment.filename ?? attachment.url}
                    </span>
                    <span className="text-xs text-slate-500">
                      {attachment.mime}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </details>
    )
  }

  if (part.type === "file") {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <span className="text-sm font-medium text-slate-900">
          {part.filename ?? part.url}
        </span>
        <span className="text-xs text-slate-500">{part.mime}</span>
      </div>
    )
  }

  if (part.type === "step-start") {
    return (
      <details className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">
          Step start
        </summary>
        {part.snapshot ? (
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
            {part.snapshot}
          </pre>
        ) : null}
      </details>
    )
  }

  if (part.type === "step-finish") {
    return (
      <details className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">
            Step finish
          </span>
          <StatusBadge label={part.reason} tone="info" />
        </summary>
        <JsonViewer
          value={{
            cost: part.cost,
            snapshot: part.snapshot,
            tokens: part.tokens,
          }}
        />
      </details>
    )
  }

  if (part.type === "snapshot") {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Snapshot
        </span>
        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
          {part.snapshot}
        </pre>
      </div>
    )
  }

  if (part.type === "patch") {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <JsonViewer value={{ files: part.files, hash: part.hash }} />
      </div>
    )
  }

  if (part.type === "agent") {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <span className="text-sm text-slate-700">{part.name}</span>
      </div>
    )
  }

  if (part.type === "retry") {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-wrap gap-2">
          <StatusBadge label="Retry" tone="warning" />
          <StatusBadge
            label={`Attempt ${String(part.attempt)}`}
            tone="warning"
          />
        </div>
        <JsonViewer
          value={{
            createdAt: part.createdAt,
            error: part.error,
          }}
        />
      </div>
    )
  }

  if (part.type === "compaction") {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap gap-2">
          <StatusBadge label="Compaction" tone="muted" />
          <StatusBadge label={part.auto ? "Auto" : "Manual"} tone="muted" />
        </div>
      </div>
    )
  }

  return (
    <details className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <summary className="flex cursor-pointer list-none flex-wrap gap-2">
        <StatusBadge label="Subtask" tone="info" />
        <StatusBadge label={part.agent} tone="info" />
      </summary>
      <JsonViewer
        value={{
          description: part.description,
          prompt: part.prompt,
        }}
      />
    </details>
  )
}
