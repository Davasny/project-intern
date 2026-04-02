"use client"

import {
  ActivityIcon,
  CheckIcon,
  DatabaseIcon,
  LayoutDashboardIcon,
  LineChartIcon,
  SettingsIcon,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { LogoIcon } from "@/components/logo"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type NavItem = {
  href: string
  label: string
}

type AppSidebarProps = {
  organizationSwitcher?: ReactNode
  projectSwitcher?: ReactNode
  navItems: NavItem[]
}

const iconMap: Record<string, ReactNode> = {
  Overview: <LayoutDashboardIcon />,
  Tasks: <CheckIcon />,
  Records: <DatabaseIcon />,
  "Schema settings": <SettingsIcon />,
  "Pipeline settings": <LineChartIcon />,
  "Activity log": <ActivityIcon />,
  "Execution monitor": <ActivityIcon />,
}

export function AppSidebar({
  organizationSwitcher,
  projectSwitcher,
  navItems,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="h-14 justify-center">
        <SidebarMenuButton asChild>
          <Link href="/app/select">
            <LogoIcon />
            <span className="font-medium">Project Intern</span>
          </Link>
        </SidebarMenuButton>
      </SidebarHeader>

      <SidebarContent>
        {organizationSwitcher && (
          <SidebarGroup>{organizationSwitcher}</SidebarGroup>
        )}

        {projectSwitcher && <SidebarGroup>{projectSwitcher}</SidebarGroup>}

        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  asChild
                  isActive={false}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    {iconMap[item.label] ?? <LayoutDashboardIcon />}
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
