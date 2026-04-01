import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import type { TrpcContext } from "@/lib/trpc/create-context"

const trpc = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
})

const isAuthenticated = trpc.middleware(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication is required.",
    })
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  })
})

export const router = trpc.router
export const publicProcedure = trpc.procedure
export const protectedProcedure = trpc.procedure.use(isAuthenticated)
