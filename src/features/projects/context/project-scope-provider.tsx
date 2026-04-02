"use client"

import { useQuery } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useTRPC } from "@/lib/trpc/client"
import {
  type ProjectScope,
  ProjectScopeContextProvider,
} from "./project-scope-context"

type ProjectScopeProviderProps = {
  children: ReactNode
  organizationSlug: string
  projectSlug: string
}

export const ProjectScopeProvider = ({
  children,
  organizationSlug,
  projectSlug,
}: ProjectScopeProviderProps) => {
  const trpc = useTRPC()

  const organizationsQuery = useQuery(
    trpc.organizations.listMine.queryOptions(),
  )

  const projectsQuery = useQuery(
    trpc.projects.listForOrganization.queryOptions({ organizationSlug }),
  )

  const organizations = organizationsQuery.data ?? []
  const projects = projectsQuery.data ?? []

  const currentOrganization =
    organizations.find((org) => org.slug === organizationSlug) ?? null
  const currentProject =
    projects.find((project) => project.slug === projectSlug) ?? null

  const isLoading = organizationsQuery.isLoading || projectsQuery.isLoading

  const value: ProjectScope = {
    organizationSlug,
    projectSlug,
    currentOrganization,
    currentProject,
    organizations,
    projects,
    isLoading,
  }

  return (
    <ProjectScopeContextProvider value={value}>
      {children}
    </ProjectScopeContextProvider>
  )
}
