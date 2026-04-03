import type { Context, MiddlewareHandler } from "hono"
import { HTTPException } from "hono/http-exception"
import { auth } from "@/features/auth/lib/auth"

export type SessionVariables = {
  session: {
    user: {
      id: string
      name: string | null
      email: string
      isAnonymous?: boolean | null
    }
    session: {
      id: string
      expiresAt: Date
    }
    activeOrganizationId?: string | null
  } | null
}

export const sessionGuard: MiddlewareHandler<{
  Variables: SessionVariables
}> = async (context, next) => {
  // Read session token from Cookie header (browser sends httpOnly cookie automatically)
  const cookieHeader = context.req.header("cookie")

  if (!cookieHeader) {
    throw new HTTPException(401, { message: "Unauthorized: no session cookie" })
  }

  const session = await auth.api.getSession({
    headers: new Headers({ cookie: cookieHeader }),
  })

  if (!session) {
    throw new HTTPException(401, { message: "Unauthorized: invalid session" })
  }

  context.set("session", session as SessionVariables["session"])

  await next()
}

export const getSession = (context: Context<{ Variables: SessionVariables }>) =>
  context.get("session")

export const requireSession = (
  context: Context<{ Variables: SessionVariables }>,
) => {
  const session = getSession(context)

  if (!session) {
    throw new HTTPException(401, { message: "Unauthorized" })
  }

  return session
}
