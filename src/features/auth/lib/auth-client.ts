import { anonymousClient, organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
import { frontendConfig } from "@/lib/config/frontend"

const authClientPlugins =
  frontendConfig.NEXT_PUBLIC_ENABLE_DEVELOPMENT_ANONYMOUS_AUTH
    ? [organizationClient(), anonymousClient()]
    : [organizationClient()]

export const authClient = createAuthClient({
  baseURL: frontendConfig.NEXT_PUBLIC_APP_URL,
  basePath: "/api/auth",
  plugins: authClientPlugins,
})
