"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { createTRPCClient, httpBatchLink } from "@trpc/client"
import { useState } from "react"
import superjson from "superjson"
import { TRPCProvider } from "@/lib/trpc/client"
import { getQueryClient } from "@/lib/trpc/query-client"
import type { AppRouter } from "@/lib/trpc/router"
import { getBaseUrl } from "@/utils/get-base-url"

export const Providers = ({ children }: { children: React.ReactNode }) => {
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
    <QueryClientProvider client={queryClient}>
      <TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  )
}
