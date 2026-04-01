import { listUserOrganizations } from "@/features/organizations/lib/list-user-organizations"
import { protectedProcedure, router } from "@/lib/trpc/init"

export const organizationsRouter = router({
  listMine: protectedProcedure.query(({ ctx }) =>
    listUserOrganizations(ctx.session.user.id),
  ),
})
