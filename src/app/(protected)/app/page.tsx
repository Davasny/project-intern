import { redirect } from "next/navigation"
import { getRequiredAuthSession } from "@/features/auth/utils/get-required-auth-session"
import { getDefaultProjectPath } from "@/features/projects/lib/get-default-project-path"

const AppEntryPage = async () => {
  const session = await getRequiredAuthSession()
  const defaultProjectScope = await getDefaultProjectPath(session.user.id)

  if (!defaultProjectScope) {
    redirect("/app")
  }

  if (defaultProjectScope.projectSlug) {
    redirect(
      `/app/${defaultProjectScope.organizationSlug}/${defaultProjectScope.projectSlug}`,
    )
  }

  redirect(`/app/${defaultProjectScope.organizationSlug}/projects`)
}

export default AppEntryPage
