"use client"

import {
  ActivityIcon,
  CheckIcon,
  DatabaseIcon,
  FolderIcon,
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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { SidebarOrgSelect } from "./sidebar-org-select"
import { SidebarProjectSelect } from "./sidebar-project-select"

type NavItem = {
  href: string
  label: string
  icon: ReactNode
}

const iconMap: Record<string, ReactNode> = {
  Overview: <LayoutDashboardIcon />,
  Tasks: <CheckIcon />,
  Records: <DatabaseIcon />,
  "Schema settings": <SettingsIcon />,
  "Activity log": <ActivityIcon />,
  "Execution monitor": <ActivityIcon />,
}

export const AppSidebar = () => {
  const { organizationSlug, projectSlug, currentProject } = useProjectScope()

  const projectNavItems: Array<NavItem> = [
    {
      href: `/app/${organizationSlug}/${projectSlug}`,
      label: "Overview",
      icon: iconMap["Overview"],
    },
    {
      href: `/app/${organizationSlug}/${projectSlug}/tasks`,
      label: "Tasks",
      icon: iconMap["Tasks"],
    },
    {
      href: `/app/${organizationSlug}/${projectSlug}/records`,
      label: "Records",
      icon: iconMap["Records"],
    },
    {
      href: `/app/${organizationSlug}/${projectSlug}/settings/schema`,
      label: "Schema settings",
      icon: iconMap["Schema settings"],
    },
    {
      href: `/app/${organizationSlug}/${projectSlug}/activity`,
      label: "Activity log",
      icon: iconMap["Activity log"],
    },
    {
      href: `/app/${organizationSlug}/${projectSlug}/execution`,
      label: "Execution monitor",
      icon: iconMap["Execution monitor"],
    },
  ]

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="h-14 justify-center">
        <SidebarMenuButton asChild>
          <Link href="/app">
            <LogoIcon />
            <span className="font-medium">Project Intern</span>
          </Link>
        </SidebarMenuButton>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Organization</SidebarGroupLabel>
          <SidebarOrgSelect />
        </SidebarGroup>

        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Projects">
                <Link href={`/app/${organizationSlug}/projects`}>
                  <FolderIcon />
                  <span>Projects</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            {currentProject?.displayName ?? "Project"}
          </SidebarGroupLabel>
          <SidebarProjectSelect />
        </SidebarGroup>

        <SidebarGroup>
          <SidebarMenu>
            {projectNavItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton asChild tooltip={item.label}>
                  <Link href={item.href}>
                    {item.icon}
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
