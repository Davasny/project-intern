import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import { AgentRunMessagePartItem } from "@/features/agent-runs/components/agent-run-message-part-item"
import type { AgentRunSessionMessage } from "@/features/agent-runs/lib/get-agent-run-session-messages"

type AgentRunMessageItemProps = {
  message: AgentRunSessionMessage
}

const roleTone = {
  assistant: "info",
  user: "success",
} as const

export const AgentRunMessageItem = ({ message }: AgentRunMessageItemProps) => {
  const isAssistant = message.role === "assistant"

  return (
    <div className={isAssistant ? "flex justify-start" : "flex justify-end"}>
      <div
        className={
          isAssistant
            ? "flex w-full max-w-4xl flex-col gap-3"
            : "flex w-full max-w-3xl flex-col gap-3"
        }
      >
        <div
          className={
            isAssistant
              ? "flex items-center gap-2 pl-1"
              : "flex items-center justify-end gap-2 pr-1"
          }
        >
          {isAssistant && message.agent ? (
            <span className="text-sm font-medium text-foreground">
              {message.agent}
            </span>
          ) : null}
          <StatusBadge label={message.role} tone={roleTone[message.role]} />
        </div>
        <div
          className={
            isAssistant
              ? "flex flex-col gap-3 rounded-[28px] rounded-tl-md border border-border bg-card p-5 shadow-sm"
              : "flex flex-col gap-3 rounded-[28px] rounded-tr-md border border-tone-success bg-tone-success-bg p-5 shadow-sm"
          }
        >
          <div className="flex flex-col gap-3">
            {message.parts.map((part) => (
              <AgentRunMessagePartItem key={part.id} part={part} />
            ))}
          </div>
          {message.tokens || message.cost !== null || message.error ? (
            <div className="flex flex-col gap-3 border-t border-border pt-3">
              {message.error ? (
                <div className="flex flex-col gap-2 rounded-2xl border border-tone-danger bg-tone-danger-bg p-3">
                  <StatusBadge label={message.error.name} tone="danger" />
                  <pre className="text-tone-danger-foreground whitespace-pre-wrap break-words text-sm">
                    {message.error.message}
                  </pre>
                </div>
              ) : null}
              {message.tokens ? (
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span>in {message.tokens.input.toLocaleString()}</span>
                  <span>out {message.tokens.output.toLocaleString()}</span>
                  <span>
                    reasoning {message.tokens.reasoning.toLocaleString()}
                  </span>
                  <span>
                    cache read {message.tokens.cacheRead.toLocaleString()}
                  </span>
                  <span>
                    cache write {message.tokens.cacheWrite.toLocaleString()}
                  </span>
                </div>
              ) : null}
              {message.cost !== null ? (
                <span className="text-xs text-muted-foreground">
                  cost ${message.cost.toFixed(6)}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
