"use client"

import { LogOutIcon, MoonIcon, SunIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { authClient } from "@/features/auth/lib/auth-client"

export type NavUserProps = {
  name: string
  email: string
  avatar?: string
}

export function NavUser({ name, email, avatar }: NavUserProps) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const isDarkTheme = resolvedTheme === "dark"

  const toggleTheme = () => {
    setTheme(isDarkTheme ? "light" : "dark")
  }

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-8 cursor-pointer">
          <AvatarImage src={avatar} />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem className="flex items-center justify-start gap-2">
          <DropdownMenuLabel className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage src={avatar} />
              <AvatarFallback>{name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <span className="font-medium text-foreground">{name}</span>
              <br />
              <div className="max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-muted-foreground text-xs">
                {email}
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="w-full cursor-pointer"
            onClick={toggleTheme}
          >
            {isDarkTheme ? <SunIcon /> : <MoonIcon />}
            Toggle theme
            <span className="ml-auto text-muted-foreground text-xs">
              {isDarkTheme ? "Dark" : "Light"}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="w-full cursor-pointer"
            variant="destructive"
            onClick={handleSignOut}
          >
            <LogOutIcon />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
