import type { QueryClient } from "@tanstack/react-query"
import type { useTRPC } from "@/lib/trpc/client"

type TRPCUtils = ReturnType<typeof useTRPC>

type InvalidateRelationQueriesParams = {
  queryClient: QueryClient
  trpc: TRPCUtils
  organizationSlug: string
  projectSlug: string
  recordId: string
  targetProjectSlug: string
  targetRecordId: string
}

export const invalidateRelationQueries = async ({
  queryClient,
  trpc,
  organizationSlug,
  projectSlug,
  recordId,
  targetProjectSlug,
  targetRecordId,
}: InvalidateRelationQueriesParams) => {
  await queryClient.invalidateQueries(
    trpc.records.list.queryFilter({ organizationSlug, projectSlug }),
  )
  await queryClient.invalidateQueries(
    trpc.records.getById.queryFilter({
      organizationSlug,
      projectSlug,
      recordId,
    }),
  )
  await queryClient.invalidateQueries(
    trpc.records.list.queryFilter({
      organizationSlug,
      projectSlug: targetProjectSlug,
    }),
  )
  await queryClient.invalidateQueries(
    trpc.records.getById.queryFilter({
      organizationSlug,
      projectSlug: targetProjectSlug,
      recordId: targetRecordId,
    }),
  )
  await queryClient.invalidateQueries(
    trpc.recordEdges.listForRecord.queryFilter({
      organizationSlug,
      projectSlug,
      recordId,
    }),
  )
  await queryClient.invalidateQueries(
    trpc.recordEdges.listForRecord.queryFilter({
      organizationSlug,
      projectSlug: targetProjectSlug,
      recordId: targetRecordId,
    }),
  )
}
