"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { createTRPCClient, httpBatchLink } from "@trpc/client"
import type { ReactNode } from "react"
import { useState } from "react"
import superjson from "superjson"
import { ThemeProvider } from "@/components/theme-provider"
import { TRPCProvider } from "@/lib/trpc/client"
import { getQueryClient } from "@/lib/trpc/query-client"
import type { AppRouter } from "@/lib/trpc/router"
import { getBaseUrl } from "@/utils/get-base-url"

export const Providers = ({ children }: { children: ReactNode }) => {
  const queryClient = getQueryClient()
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
        }),
      ],
    }),
  )

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <QueryClientProvider client={queryClient}>
        <TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
          {children}
        </TRPCProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
