import { headers } from "next/headers"
import { auth } from "@/features/auth/lib/auth"

export const getAuthSession = async () =>
  auth.api.getSession({
    headers: await headers(),
  })
