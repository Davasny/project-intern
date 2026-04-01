import { TRPCError } from "@trpc/server"
import { backendConfig } from "@/lib/config/backend"

type AssertExecutorAuthParams = {
  bearerToken: string | null
}

export const assertExecutorAuth = ({
  bearerToken,
}: AssertExecutorAuthParams) => {
  if (bearerToken !== backendConfig.CRM_EXECUTOR_TOKEN) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Executor credentials are invalid.",
    })
  }

  return {
    actorId: "executor",
    actorType: "executor" as const,
  }
}
