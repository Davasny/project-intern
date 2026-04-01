import { redirect } from "next/navigation"
import { getRequiredAuthSession } from "@/features/auth/utils/get-required-auth-session"

const ProtectedAppLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode
}>) => {
  const session = await getRequiredAuthSession()

  if (!session) {
    redirect("/")
  }

  return children
}

export default ProtectedAppLayout
