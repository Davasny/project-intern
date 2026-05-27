import type { ReactNode } from "react"
import { AppNavbar } from "@/components/app-navbar"
import { AppSidebar } from "@/components/app-sidebar"
import type { NavUserProps } from "@/components/nav-user"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

type AppShellProps = {
  children: ReactNode
  user: NavUserProps
}

export const AppShell = ({ children, user }: AppShellProps) => {
  return (
    <div className="overflow-hidden">
      <SidebarProvider className="relative h-svh">
        <AppSidebar />

        <SidebarInset>
          <AppNavbar user={user} />
          <div
            className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6"
            id="main-content"
          >
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
