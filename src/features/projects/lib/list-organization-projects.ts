import { TRPCError } from "@trpc/server"
import { ensureOrganizationAccess } from "@/features/projects/lib/ensure-organization-access"
import { listOrganizationProjectsById } from "@/features/projects/lib/list-organization-projects-by-id"

type ListOrganizationProjectsParams = {
  organizationSlug: string
  userId: string
}

export const listOrganizationProjects = async ({
  organizationSlug,
  userId,
}: ListOrganizationProjectsParams) => {
  const organization = await ensureOrganizationAccess({
    organizationSlug,
    userId,
  })

  if (!organization) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this organization.",
    })
  }

  return listOrganizationProjectsById(organization.id)
}
