"use client"

import { createContext, useContext } from "react"

type Organization = {
  id: string
  name: string
  slug: string
  role: string
}

type Project = {
  id: string
  displayName: string
  slug: string
}

type ProjectScope = {
  organizationSlug: string
  projectSlug: string
  currentOrganization: Organization | null
  currentProject: Project | null
  organizations: Array<Organization>
  projects: Array<Project>
  isLoading: boolean
}

const ProjectScopeContext = createContext<ProjectScope | null>(null)

export const useProjectScope = (): ProjectScope => {
  const context = useContext(ProjectScopeContext)
  if (!context) {
    throw new Error(
      "useProjectScope must be used within a ProjectScopeProvider",
    )
  }
  return context
}

export const ProjectScopeContextProvider = ProjectScopeContext.Provider
