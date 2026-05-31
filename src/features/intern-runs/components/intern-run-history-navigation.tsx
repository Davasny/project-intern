import type { ReactNode } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { InternRunHistoryEvent } from "@/features/intern-runs/lib/intern-run-history-event"

type InternRunHistoryNavigationProps = {
  children: ReactNode
  nextEvent: InternRunHistoryEvent | null
  onSelectEvent: (eventId: string) => void
  previousEvent: InternRunHistoryEvent | null
}

export const InternRunHistoryNavigation = ({
  children,
  nextEvent,
  onSelectEvent,
  previousEvent,
}: InternRunHistoryNavigationProps) => (
  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-3">
    <Button
      aria-label={
        previousEvent
          ? `Select previous event: ${previousEvent.title}`
          : "No previous event"
      }
      disabled={!previousEvent}
      onClick={() => {
        if (previousEvent) {
          onSelectEvent(previousEvent.id)
        }
      }}
      className="mb-1.5"
      size="icon-sm"
      type="button"
      variant="outline"
    >
      <ChevronLeftIcon aria-hidden="true" />
    </Button>
    <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:thin]">
      {children}
    </div>
    <Button
      aria-label={
        nextEvent ? `Select next event: ${nextEvent.title}` : "No next event"
      }
      disabled={!nextEvent}
      onClick={() => {
        if (nextEvent) {
          onSelectEvent(nextEvent.id)
        }
      }}
      className="mb-1.5"
      size="icon-sm"
      type="button"
      variant="outline"
    >
      <ChevronRightIcon aria-hidden="true" />
    </Button>
  </div>
)
