"use client"

import { useEffect } from "react"
import { AlertTriangleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

const AppError = ({ error, reset }: ErrorPageProps) => {
  useEffect(() => {
    console.error("Unhandled app error:", error)
  }, [error])

  return (
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
            <h3 className="text-foreground text-lg font-semibold">
              Something went wrong
            </h3>
            <p className="text-muted-foreground text-sm">
              An unexpected error occurred. Please try again.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={reset} type="button" variant="default">
            Try again
          </Button>
          <Button
            onClick={() => (window.location.href = "/app")}
            type="button"
            variant="outline"
          >
            Go to projects
          </Button>
        </div>
      </SectionCardContent>
    </SectionCard>
  )
}

export default AppError
