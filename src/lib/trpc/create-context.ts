import { auth } from "@/features/auth/lib/auth"
import { ensureUserOrganization } from "@/features/auth/utils/ensure-user-organization"

type CreateTrpcContextParams = {
  headers: Headers
}

export const createTrpcContext = async ({
  headers,
}: CreateTrpcContextParams) => {
  const session = await auth.api.getSession({ headers })

  if (session) {
    await ensureUserOrganization({
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      isAnonymous: session.user.isAnonymous ?? false,
    })
  }

  return {
    headers,
    session,
  }
}

export type TrpcContext = Awaited<ReturnType<typeof createTrpcContext>>
