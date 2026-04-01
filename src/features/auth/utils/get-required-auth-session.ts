import { redirect } from "next/navigation"
import { getAuthSession } from "@/features/auth/utils/get-auth-session"

export const getRequiredAuthSession = async () => {
  const session = await getAuthSession()

  if (!session) {
    redirect("/")
  }

  return session
}
