import type { ReactNode } from "react"
import { AppNavbar } from "@/components/app-navbar"
import { AppSidebar } from "@/components/app-sidebar"
import type { NavUserProps } from "@/components/nav-user"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

type AppShellProps = {
  children: ReactNode
  organizationSwitcher?: ReactNode
  projectSwitcher?: ReactNode
  navItems: Array<{ href: string; label: string }>
  user: NavUserProps
}

export function AppShell({
  children,
  organizationSwitcher,
  projectSwitcher,
  navItems,
  user,
}: AppShellProps) {
  return (
    <div className="overflow-hidden">
      <SidebarProvider className="relative h-svh">
        <AppSidebar
          organizationSwitcher={organizationSwitcher}
          projectSwitcher={projectSwitcher}
          navItems={navItems}
        />

        <SidebarInset>
          <AppNavbar user={user} />
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
