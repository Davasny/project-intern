"use client"

import { useQuery } from "@tanstack/react-query"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

export const useExecutionMonitorQuery = () => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()

  return useQuery({
    ...trpc.execution.getMonitor.queryOptions({
      organizationSlug,
      projectSlug,
    }),
    refetchInterval: (query) => {
      const data = query.state.data
      return data && data.summary.activeCount > 0 ? 3000 : false
    },
  })
}
