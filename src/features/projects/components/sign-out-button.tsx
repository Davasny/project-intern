"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { authClient } from "@/features/auth/lib/auth-client"

export const SignOutButton = () => {
  const router = useRouter()

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/")
          router.refresh()
        },
      },
    })
  }

  return (
    <Button onClick={handleSignOut} variant="ghost">
      Sign out
    </Button>
  )
}
