import { listUserOrganizations } from "@/features/organizations/lib/list-user-organizations"
import { listOrganizationProjectsById } from "@/features/projects/lib/list-organization-projects-by-id"

export const getDefaultProjectPath = async (userId: string) => {
  const organizations = await listUserOrganizations(userId)
  const firstOrganization = organizations[0]

  if (!firstOrganization) {
    return null
  }

  const projects = await listOrganizationProjectsById(firstOrganization.id)
  const firstProject = projects[0]

  if (!firstProject) {
    return null
  }

  return {
    organizationSlug: firstOrganization.slug,
    projectSlug: firstProject.slug,
  }
}
