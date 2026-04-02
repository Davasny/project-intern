"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { authClient } from "@/features/auth/lib/auth-client"

type ProjectScopeAccountMenuProps = {
  userDisplayName: string
}

export const ProjectScopeAccountMenu = ({
  userDisplayName,
}: ProjectScopeAccountMenuProps) => {
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
    <div className="flex items-center justify-between gap-3 border-t border-[var(--app-border-soft)] pt-4">
      <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
        {userDisplayName}
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost">
            More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleSignOut} variant="destructive">
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
