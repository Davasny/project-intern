import type { ReactNode } from "react"
import { AlertTriangleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"

type ErrorStateProps = {
  action?: ReactNode
  message: string
  title?: string
}

export const ErrorState = ({
  action,
  message,
  title = "Something went wrong",
}: ErrorStateProps) => (
  <SectionCard>
    <SectionCardContent
      className="flex flex-col items-start gap-4"
      role="alert"
    >
      <div className="flex items-center gap-3">
        <AlertTriangleIcon
          aria-hidden="true"
          className="size-5 shrink-0 text-tone-danger-foreground"
        />
        <div className="flex flex-col gap-1">
          <h3 className="text-foreground text-lg font-semibold">{title}</h3>
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>
      </div>
      {action ?? (
        <Button
          onClick={() => window.location.reload()}
          type="button"
          variant="outline"
        >
          Reload page
        </Button>
      )}
    </SectionCardContent>
  </SectionCard>
)
