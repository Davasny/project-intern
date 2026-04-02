"use client"

import { useQuery } from "@tanstack/react-query"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { AgentRunMessageItem } from "@/features/agent-runs/components/agent-run-message-item"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

type AgentRunMessagesProps = {
  agentRunId: string
}

export const AgentRunMessages = ({ agentRunId }: AgentRunMessagesProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const messagesQuery = useQuery({
    ...trpc.agentRuns.getSessionMessages.queryOptions({
      agentRunId,
      organizationSlug,
      projectSlug,
    }),
  })

  if (messagesQuery.isLoading) {
    return <LoadingState label="Loading OpenCode history..." />
  }

  if (!messagesQuery.data) {
    return (
      <SectionCard>
        <SectionCardHeader>
          <h2 className="text-lg font-semibold text-slate-950">
            OpenCode History
          </h2>
        </SectionCardHeader>
        <SectionCardContent>
          <p className="text-sm text-slate-500">
            OpenCode history could not be loaded.
          </p>
        </SectionCardContent>
      </SectionCard>
    )
  }

  if (!messagesQuery.data.sessionReference || !messagesQuery.data.directory) {
    return (
      <SectionCard>
        <SectionCardHeader>
          <h2 className="text-lg font-semibold text-slate-950">
            OpenCode History
          </h2>
        </SectionCardHeader>
        <SectionCardContent className="flex flex-col gap-2">
          <p className="text-sm text-slate-500">
            This run does not have enough OpenCode session metadata to load
            message history.
          </p>
        </SectionCardContent>
      </SectionCard>
    )
  }

  return (
    <SectionCard>
      <SectionCardHeader>
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-slate-950">
            OpenCode History
          </h2>
          <p className="text-sm text-slate-500">
            Conversation view with tool activity inline.
          </p>
        </div>
      </SectionCardHeader>
      <SectionCardContent className="flex flex-col gap-6 bg-gradient-to-b from-slate-50 to-white">
        {messagesQuery.data.messages.length === 0 ? (
          <p className="text-sm text-slate-500">
            No OpenCode messages were returned for this run.
          </p>
        ) : (
          messagesQuery.data.messages.map((message) => (
            <AgentRunMessageItem key={message.id} message={message} />
          ))
        )}
      </SectionCardContent>
    </SectionCard>
  )
}
