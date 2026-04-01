import { publicProcedure, router } from "@/lib/trpc/init"

export const authRouter = router({
  viewer: publicProcedure.query(({ ctx }) => ({
    session: ctx.session,
  })),
})
