import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { JsonViewer } from "@/components/ui/json-viewer/json-viewer"
import { StatusBadge } from "@/components/ui/status-badge/status-badge"
import type { AgentRunSessionMessagePart } from "@/features/agent-runs/lib/agent-run-session-message-types"

type AgentRunMessagePartItemProps = {
  part: AgentRunSessionMessagePart
}

type PartTone = "amber" | "default" | "violet"

type PartSpacing = "2" | "3" | "4"

type PartContainerProps = {
  children: ReactNode
  spacing: PartSpacing
  tone: PartTone
}

type PartDisclosureProps = {
  children: ReactNode
  spacing: PartSpacing
  summaryClassName: string
  summary: ReactNode
  tone: PartTone
}

type PartFieldProps = {
  children: ReactNode
  label: string
}

type PartTextBlockTone = "default" | "danger"

type PartTextBlockProps = {
  text: string
  tone: PartTextBlockTone
}

type AttachmentItemProps = {
  filename: string | null
  mime: string
  url: string
}

const toolStateTone = {
  completed: "success",
  error: "danger",
  pending: "warning",
  running: "info",
} as const

const partToneClasses: Record<PartTone, string> = {
  amber: "border-tone-warning bg-tone-warning-bg",
  default: "border-border bg-muted",
  violet: "border-tone-info bg-tone-info-bg",
}

const partSpacingClasses: Record<PartSpacing, string> = {
  "2": "gap-2",
  "3": "gap-3",
  "4": "gap-4",
}

const partTextBlockClasses: Record<PartTextBlockTone, string> = {
  danger:
    "text-tone-danger-foreground overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-tone-danger-bg p-4 text-xs",
  default:
    "overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-foreground p-4 text-xs text-background",
}

const PartContainer = ({ children, spacing, tone }: PartContainerProps) => (
  <div className={`rounded-2xl border p-4 ${partToneClasses[tone]}`}>
    <div className={`flex flex-col ${partSpacingClasses[spacing]}`}>
      {children}
    </div>
  </div>
)

const PartDisclosure = ({
  children,
  spacing,
  summaryClassName,
  summary,
  tone,
}: PartDisclosureProps) => (
  <details className={`rounded-2xl border p-4 ${partToneClasses[tone]}`}>
    <summary className={summaryClassName}>{summary}</summary>
    <div
      className={`flex flex-col pt-4 empty:pt-0 ${partSpacingClasses[spacing]}`}
    >
      {children}
    </div>
  </details>
)

const PartField = ({ children, label }: PartFieldProps) => (
  <div className="flex flex-col gap-2">
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
    {children}
  </div>
)

const PartTextBlock = ({ text, tone }: PartTextBlockProps) => (
  <pre className={partTextBlockClasses[tone]}>{text}</pre>
)

const AttachmentItem = ({ filename, mime, url }: AttachmentItemProps) => (
  <Card className="flex flex-col gap-1 p-3">
    <span className="text-sm font-medium text-foreground">
      {filename ?? url}
    </span>
    <span className="text-xs text-muted-foreground">{mime}</span>
  </Card>
)

export const AgentRunMessagePartItem = ({
  part,
}: AgentRunMessagePartItemProps) => {
  if (part.type === "text") {
    return (
      <div className="flex flex-col gap-2">
        <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
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
      <PartDisclosure
        spacing="3"
        tone="violet"
        summaryClassName="text-tone-info-foreground cursor-pointer text-sm font-medium"
        summary={<span>Reasoning</span>}
      >
        <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
          {part.text}
        </pre>
      </PartDisclosure>
    )
  }

  if (part.type === "tool") {
    return (
      <PartDisclosure
        spacing="4"
        tone="default"
        summaryClassName="flex cursor-pointer list-none flex-wrap items-center gap-2"
        summary={
          <>
            <span className="font-medium text-foreground">{part.tool}</span>
            <StatusBadge
              label={part.status}
              tone={toolStateTone[part.status]}
            />
            {part.title ? (
              <span className="text-sm text-muted-foreground">
                {part.title}
              </span>
            ) : null}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <PartField label="Call ID">
            <code className="break-all rounded-lg bg-background px-3 py-2 text-xs text-foreground">
              {part.callId}
            </code>
          </PartField>
          <PartField label="Input">
            <JsonViewer value={part.input} />
          </PartField>
          {part.metadata ? (
            <PartField label="Metadata">
              <JsonViewer value={part.metadata} />
            </PartField>
          ) : null}
          {part.output ? (
            <PartField label="Output">
              <PartTextBlock text={part.output} tone="default" />
            </PartField>
          ) : null}
          {part.error ? (
            <PartField label="Error">
              <PartTextBlock text={part.error} tone="danger" />
            </PartField>
          ) : null}
          {part.attachments.length > 0 ? (
            <PartField label="Attachments">
              <div className="flex flex-col gap-2">
                {part.attachments.map((attachment) => (
                  <AttachmentItem
                    key={attachment.url}
                    filename={attachment.filename}
                    mime={attachment.mime}
                    url={attachment.url}
                  />
                ))}
              </div>
            </PartField>
          ) : null}
        </div>
      </PartDisclosure>
    )
  }

  if (part.type === "file") {
    return (
      <PartContainer spacing="2" tone="default">
        <span className="text-sm font-medium text-foreground">
          {part.filename ?? part.url}
        </span>
        <span className="text-xs text-muted-foreground">{part.mime}</span>
      </PartContainer>
    )
  }

  if (part.type === "step-start") {
    return (
      <PartDisclosure
        spacing="3"
        tone="default"
        summaryClassName="cursor-pointer text-sm font-medium text-foreground"
        summary={<span>Step start</span>}
      >
        {part.snapshot ? (
          <PartTextBlock text={part.snapshot} tone="default" />
        ) : null}
      </PartDisclosure>
    )
  }

  if (part.type === "step-finish") {
    return (
      <PartDisclosure
        spacing="3"
        tone="default"
        summaryClassName="flex cursor-pointer list-none flex-wrap items-center gap-2"
        summary={
          <>
            <span className="text-sm font-medium text-foreground">
              Step finish
            </span>
            <StatusBadge label={part.reason} tone="info" />
          </>
        }
      >
        <JsonViewer
          value={{
            cost: part.cost,
            snapshot: part.snapshot,
            tokens: part.tokens,
          }}
        />
      </PartDisclosure>
    )
  }

  if (part.type === "snapshot") {
    return (
      <PartContainer spacing="2" tone="default">
        <PartField label="Snapshot">
          <PartTextBlock text={part.snapshot} tone="default" />
        </PartField>
      </PartContainer>
    )
  }

  if (part.type === "patch") {
    return (
      <PartContainer spacing="3" tone="default">
        <JsonViewer value={{ files: part.files, hash: part.hash }} />
      </PartContainer>
    )
  }

  if (part.type === "agent") {
    return (
      <PartContainer spacing="2" tone="default">
        <span className="text-sm text-foreground">{part.name}</span>
      </PartContainer>
    )
  }

  if (part.type === "retry") {
    return (
      <PartContainer spacing="3" tone="amber">
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
      </PartContainer>
    )
  }

  if (part.type === "compaction") {
    return (
      <PartContainer spacing="2" tone="default">
        <div className="flex flex-wrap gap-2">
          <StatusBadge label="Compaction" tone="muted" />
          <StatusBadge label={part.auto ? "Auto" : "Manual"} tone="muted" />
        </div>
      </PartContainer>
    )
  }

  return (
    <PartDisclosure
      spacing="3"
      tone="default"
      summaryClassName="flex cursor-pointer list-none flex-wrap gap-2"
      summary={
        <>
          <StatusBadge label="Subtask" tone="info" />
          <StatusBadge label={part.agent} tone="info" />
        </>
      }
    >
      <JsonViewer
        value={{
          description: part.description,
          prompt: part.prompt,
        }}
      />
    </PartDisclosure>
  )
}
