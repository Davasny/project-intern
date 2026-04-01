import { redirect } from "next/navigation"
import { AuthEntryPanel } from "@/features/auth/components/auth-entry-panel"
import { getAuthSession } from "@/features/auth/utils/get-auth-session"

const LandingPage = async () => {
  const session = await getAuthSession()

  if (session) {
    redirect("/app")
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <AuthEntryPanel />
    </main>
  )
}

export default LandingPage
