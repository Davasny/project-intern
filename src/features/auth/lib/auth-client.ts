import { apiKeyClient } from "@better-auth/api-key/client"
import { anonymousClient, organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
import { frontendConfig } from "@/lib/config/frontend"

export const authClient = createAuthClient({
  baseURL: frontendConfig.NEXT_PUBLIC_APP_URL,
  basePath: "/api/auth",
  plugins: [organizationClient(), anonymousClient(), apiKeyClient()],
})
