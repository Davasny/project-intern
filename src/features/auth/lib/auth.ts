import { apiKey } from "@better-auth/api-key"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { anonymous, organization } from "better-auth/plugins"
import { authSchema } from "@/features/auth/schema"
import { ensureUserOrganization } from "@/features/auth/utils/ensure-user-organization"
import { findFirstOrganizationIdForUser } from "@/features/auth/utils/find-first-organization-id-for-user"
import { backendConfig } from "@/lib/config/backend"
import { frontendConfig } from "@/lib/config/frontend"
import { db } from "@/lib/db"

export const auth = betterAuth({
  baseURL: backendConfig.BETTER_AUTH_URL,
  secret: backendConfig.BETTER_AUTH_SECRET,
  plugins: [
    organization({
      schema: {
        member: {
          modelName: "organizationMembership",
        },
      },
    }),
    apiKey({
      configId: "mcp",
      defaultPrefix: "mcp_",
      enableMetadata: true,
      rateLimit: {
        enabled: false,
      },
      references: "organization",
    }),
    anonymous({
      generateName: () => `Guest ${crypto.randomUUID().slice(0, 8)}`,
      generateRandomEmail: () =>
        `guest-${crypto.randomUUID()}@project-intern.local`,
    }),
  ],
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  trustedOrigins: [frontendConfig.NEXT_PUBLIC_APP_URL],
  socialProviders: {
    github: {
      clientId: backendConfig.GITHUB_CLIENT_ID,
      clientSecret: backendConfig.GITHUB_CLIENT_SECRET,
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  user: {
    additionalFields: {
      isAnonymous: {
        type: "boolean",
        required: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await ensureUserOrganization({
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            isAnonymous: Boolean(user.isAnonymous),
          })
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const activeOrganizationId = await findFirstOrganizationIdForUser(
            session.userId,
          )

          if (!activeOrganizationId) {
            return { data: session }
          }

          return {
            data: {
              ...session,
              activeOrganizationId,
            },
          }
        },
      },
    },
  },
})
