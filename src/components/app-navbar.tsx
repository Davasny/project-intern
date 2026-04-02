"use client"

import { usePathname } from "next/navigation"
import type { NavUserProps } from "@/components/nav-user"
import { NavUser } from "@/components/nav-user"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { cn } from "@/lib/utils"
import { CustomSidebarTrigger } from "../../components/custom-sidebar-trigger"

const segmentLabels: Record<string, string> = {
  tasks: "Tasks",
  records: "Records",
  settings: "Settings",
  schema: "Schema",
  pipelines: "Pipelines",
  activity: "Activity",
  execution: "Execution",
  runs: "Runs",
}

const isUuidLike = (segment: string): boolean => {
  return /^[a-zA-Z0-9_-]{20,}$/.test(segment)
}

const formatDynamicSegment = (segment: string): string => {
  if (segment.length <= 8) return segment
  return `${segment.slice(0, 8)}…`
}

type BreadcrumbItemData = {
  label: string
  href: string
  isCurrentPage: boolean
}

const getBreadcrumbs = (
  pathname: string,
  projectName?: string,
): Array<BreadcrumbItemData> => {
  const segments = pathname.split("/").filter(Boolean)

  const appIndex = segments.indexOf("app")
  if (appIndex === -1) {
    return []
  }

  const pathAfterApp = segments.slice(appIndex + 1)

  if (pathAfterApp.length < 2) {
    return []
  }

  const [orgSlug, projectSlug, ...restSegments] = pathAfterApp

  const breadcrumbs: Array<BreadcrumbItemData> = []

  const basePath = `/app/${orgSlug}/${projectSlug}`
  const displayName = projectName ?? projectSlug

  breadcrumbs.push({
    label: displayName,
    href: basePath,
    isCurrentPage: restSegments.length === 0,
  })

  let currentPath = basePath

  for (let i = 0; i < restSegments.length; i++) {
    const segment = restSegments[i]
    currentPath = `${currentPath}/${segment}`

    const isLast = i === restSegments.length - 1

    let label: string
    if (isUuidLike(segment)) {
      label = formatDynamicSegment(segment)
    } else {
      label =
        segmentLabels[segment] ??
        segment.charAt(0).toUpperCase() + segment.slice(1)
    }

    breadcrumbs.push({
      label,
      href: currentPath,
      isCurrentPage: isLast,
    })
  }

  return breadcrumbs
}

export const AppNavbar = ({ user }: { user: NavUserProps }) => {
  const pathname = usePathname()
  const { currentProject } = useProjectScope()

  const breadcrumbs = getBreadcrumbs(pathname, currentProject?.displayName)

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 md:px-6",
      )}
    >
      <div className="flex items-center gap-3">
        <CustomSidebarTrigger />
        <Separator
          className="mr-2 h-4 data-[orientation=vertical]:self-center"
          orientation="vertical"
        />
        {breadcrumbs.length > 0 ? (
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <BreadcrumbItem key={crumb.href}>
                  {index > 0 && <BreadcrumbSeparator />}
                  {crumb.isCurrentPage ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Separator
          className="h-4 data-[orientation=vertical]:self-center"
          orientation="vertical"
        />
        <NavUser name={user.name} email={user.email} avatar={user.avatar} />
      </div>
    </header>
  )
}
