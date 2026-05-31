"use client"

import { useQuery } from "@tanstack/react-query"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { InternRunHistoryExplorer } from "@/features/intern-runs/components/intern-run-history-explorer"
import { mapSessionMessagesToHistoryEvents } from "@/features/intern-runs/lib/map-session-messages-to-history-events"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

type InternRunMessagesProps = {
  internRunId: string
  isRunActive: boolean
}

export const InternRunMessages = ({
  internRunId,
  isRunActive,
}: InternRunMessagesProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const messagesQuery = useQuery({
    ...trpc.internRuns.getSessionMessages.queryOptions({
      internRunId,
      organizationSlug,
      projectSlug,
    }),
    refetchInterval: isRunActive ? 2000 : false,
    refetchOnWindowFocus: true,
  })

  if (messagesQuery.isLoading) {
    return <LoadingState label="Loading OpenCode history..." />
  }

  if (!messagesQuery.data) {
    return (
      <SectionCard>
        <SectionCardHeader>
          <h2 className="text-lg font-semibold text-foreground">
            OpenCode History
          </h2>
        </SectionCardHeader>
        <SectionCardContent>
          <p className="text-sm text-muted-foreground">
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
          <h2 className="text-lg font-semibold text-foreground">
            OpenCode History
          </h2>
        </SectionCardHeader>
        <SectionCardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            This run does not have enough OpenCode session metadata to load
            message history.
          </p>
        </SectionCardContent>
      </SectionCard>
    )
  }

  const events = mapSessionMessagesToHistoryEvents(
    messagesQuery.data.messages,
    messagesQuery.data.directory,
  )

  return <InternRunHistoryExplorer events={events} />
}
