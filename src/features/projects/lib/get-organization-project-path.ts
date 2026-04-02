import { ensureOrganizationAccess } from "@/features/projects/lib/ensure-organization-access"
import { listOrganizationProjectsById } from "@/features/projects/lib/list-organization-projects-by-id"

export const getOrganizationProjectPath = async (
  userId: string,
  organizationSlug: string,
) => {
  const organization = await ensureOrganizationAccess({
    organizationSlug,
    userId,
  })

  if (!organization) {
    return null
  }

  const projects = await listOrganizationProjectsById(organization.id)
  const firstProject = projects[0]

  return {
    organizationSlug: organization.slug,
    projectSlug: firstProject?.slug ?? null,
  }
}
