"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { authClient } from "@/features/auth/lib/auth-client"
import { frontendConfig } from "@/lib/config/frontend"

export const AuthEntryPanel = () => {
  const [isPending, setIsPending] = useState(false)

  const handleGitHubSignIn = async () => {
    setIsPending(true)
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/app",
    })
    setIsPending(false)
  }

  const handleAnonymousSignIn = async () => {
    setIsPending(true)
    await authClient.signIn.anonymous()
    window.location.assign("/app")
    setIsPending(false)
  }

  return (
    <Card className="w-full max-w-lg p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Project Intern
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Auth, organizations, and projects
          </h1>
          <p className="text-sm text-slate-600">
            Sign in with GitHub, bootstrap your personal organization, and enter
            project scope.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button disabled={isPending} onClick={handleGitHubSignIn}>
            Continue with GitHub
          </Button>
          {frontendConfig.NEXT_PUBLIC_ENABLE_DEVELOPMENT_ANONYMOUS_AUTH ? (
            <Button
              disabled={isPending}
              onClick={handleAnonymousSignIn}
              variant="secondary"
            >
              Continue anonymously (development)
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
