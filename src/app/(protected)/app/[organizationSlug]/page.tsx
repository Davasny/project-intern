import { redirect } from "next/navigation"
import { getRequiredAuthSession } from "@/features/auth/utils/get-required-auth-session"
import { getOrganizationProjectPath } from "@/features/projects/lib/get-organization-project-path"

const OrganizationEntryPage = async ({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) => {
  const { organizationSlug } = await params
  const session = await getRequiredAuthSession()
  const projectScope = await getOrganizationProjectPath(
    session.user.id,
    organizationSlug,
  )

  if (!projectScope) {
    redirect(`/app/select?organization=${organizationSlug}`)
  }

  redirect(`/app/${projectScope.organizationSlug}/${projectScope.projectSlug}`)
}

export default OrganizationEntryPage
