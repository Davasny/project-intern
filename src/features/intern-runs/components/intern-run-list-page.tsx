"use client"

import { useQuery } from "@tanstack/react-query"
import { useAtom } from "jotai"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table/data-table"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { PageHeaderActions } from "@/components/ui/page-header/page-header-actions"
import { UsageBreakdownCard } from "@/components/ui/usage-metric/usage-breakdown-card"
import {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table"
import { InternRunListHeaderCell } from "@/features/intern-runs/components/intern-run-list-header-cell"
import { InternRunRefreshMissingStatsButton } from "@/features/intern-runs/components/intern-run-refresh-missing-stats-button"
import { InternRunListRow } from "@/features/intern-runs/components/intern-run-list-row"
import { getInternRunListFilterOptions } from "@/features/intern-runs/lib/get-intern-run-list-filter-options"
import { getInternRunListRangeFilterBounds } from "@/features/intern-runs/lib/get-intern-run-list-range-filter-bounds"
import { getInternRunListVisibleRuns } from "@/features/intern-runs/lib/get-intern-run-list-visible-runs"
import { hasInternRunListFilters } from "@/features/intern-runs/lib/has-intern-run-list-filters"
import {
  type InternRunListRangeFilterColumnId,
  type InternRunListTextFilterColumnId,
  internRunListFilterColumnLabels,
} from "@/features/intern-runs/lib/intern-run-list-filter-column"
import {
  emptyInternRunListFilters,
  type InternRunListRangeFilterValue,
} from "@/features/intern-runs/lib/intern-run-list-filters"
import { isInternRunStateActive } from "@/features/intern-runs/schemas/intern-run-state"
import { internRunListFiltersAtom } from "@/features/intern-runs/state/intern-run-list-filters-atom"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

export const InternRunListPage = () => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const [filters, setFilters] = useAtom(internRunListFiltersAtom)
  const runsQuery = useQuery({
    ...trpc.internRuns.list.queryOptions({
      organizationSlug,
      projectSlug,
    }),
    refetchInterval: (query) => {
      const runs = query.state.data ?? []
      return runs.some((run) => isInternRunStateActive(run.state))
        ? 3000
        : false
    },
  })

  if (runsQuery.isLoading) {
    return <LoadingState label="Loading intern runs..." />
  }

  if (!runsQuery.data) {
    return <LoadingState label="Intern runs could not be loaded." />
  }

  const hasFilters = hasInternRunListFilters(filters)
  const filteredRuns = getInternRunListVisibleRuns({
    filters,
    runs: runsQuery.data,
  })
  const projectUsage = runsQuery.data.reduce(
    (usage, run) => {
      const inputTokens = run.inputTokens ?? run.tokenInput ?? 0
      const outputTokens = run.outputTokens ?? run.tokenOutput ?? 0
      const cachedInputTokens = run.cachedInputTokens ?? 0
      const cacheWriteTokens = run.cacheWriteTokens ?? 0
      const costUsd = run.costUsd ?? run.estimatedCostUsd
      const durationMs = run.durationMs ?? 0

      return {
        runCount: usage.runCount + 1,
        totalCachedInputTokens:
          usage.totalCachedInputTokens + cachedInputTokens,
        totalCacheWriteTokens: usage.totalCacheWriteTokens + cacheWriteTokens,
        totalCostUsd: usage.totalCostUsd + (costUsd === null ? 0 : Number(costUsd)),
        totalDurationMs: usage.totalDurationMs + durationMs,
        totalInputTokens: usage.totalInputTokens + inputTokens,
        totalOutputTokens: usage.totalOutputTokens + outputTokens,
        totalTokens: usage.totalTokens + inputTokens + outputTokens + cachedInputTokens,
      }
    },
    {
      runCount: 0,
      totalCachedInputTokens: 0,
      totalCacheWriteTokens: 0,
      totalCostUsd: 0,
      totalDurationMs: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
    },
  )
  const handleFilterChange = (
    columnId: InternRunListTextFilterColumnId,
    value: string,
  ) => {
    setFilters({
      ...filters,
      text: {
        ...filters.text,
        [columnId]: value,
      },
    })
  }
  const handleRangeFilterChange = (
    columnId: InternRunListRangeFilterColumnId,
    value: InternRunListRangeFilterValue | undefined,
  ) => {
    setFilters({
      ...filters,
      ranges: {
        ...filters.ranges,
        [columnId]: value,
      },
    })
  }
  const handleFiltersReset = () => {
    setFilters(emptyInternRunListFilters)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Intern runs
          </h1>
          <p className="text-sm text-muted-foreground">
            Complete history of all intern run executions across tasks and
            records.
          </p>
        </div>
        <PageHeaderActions>
          <InternRunRefreshMissingStatsButton
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
          />
          {hasFilters ? (
            <Button onClick={handleFiltersReset} type="button" variant="outline">
              Reset filters
            </Button>
          ) : null}
        </PageHeaderActions>
      </PageHeader>
      <UsageBreakdownCard
        averageCostUsd={
          projectUsage.runCount > 0
            ? projectUsage.totalCostUsd / projectUsage.runCount
            : null
        }
        runCount={projectUsage.runCount}
        title="Project usage"
        totalCachedInputTokens={projectUsage.totalCachedInputTokens}
        totalCacheWriteTokens={projectUsage.totalCacheWriteTokens}
        totalCostUsd={projectUsage.totalCostUsd}
        totalDurationMs={projectUsage.totalDurationMs}
        totalInputTokens={projectUsage.totalInputTokens}
        totalOutputTokens={projectUsage.totalOutputTokens}
        totalTokens={projectUsage.totalTokens}
      />
      <DataTable>
        <TableHead>
          <TableRow>
            <InternRunListHeaderCell
              columnId="state"
              filterValue={filters.text.state ?? ""}
              kind="text"
              label={internRunListFilterColumnLabels.state}
              onFilterChange={handleFilterChange}
              options={getInternRunListFilterOptions({
                columnId: "state",
                runs: runsQuery.data,
              })}
            />
            <InternRunListHeaderCell
              columnId="provider"
              filterValue={filters.text.provider ?? ""}
              kind="text"
              label={internRunListFilterColumnLabels.provider}
              onFilterChange={handleFilterChange}
              options={getInternRunListFilterOptions({
                columnId: "provider",
                runs: runsQuery.data,
              })}
            />
            <InternRunListHeaderCell
              columnId="model"
              filterValue={filters.text.model ?? ""}
              kind="text"
              label={internRunListFilterColumnLabels.model}
              onFilterChange={handleFilterChange}
              options={getInternRunListFilterOptions({
                columnId: "model",
                runs: runsQuery.data,
              })}
            />
            <InternRunListHeaderCell
              bounds={getInternRunListRangeFilterBounds({
                columnId: "temperature",
                runs: runsQuery.data,
              })}
              columnId="temperature"
              filterValue={filters.ranges.temperature}
              kind="range"
              label={internRunListFilterColumnLabels.temperature}
              onFilterChange={handleRangeFilterChange}
            />
            <InternRunListHeaderCell
              columnId="selectedIntern"
              filterValue={filters.text.selectedIntern ?? ""}
              kind="text"
              label={internRunListFilterColumnLabels.selectedIntern}
              onFilterChange={handleFilterChange}
              options={getInternRunListFilterOptions({
                columnId: "selectedIntern",
                runs: runsQuery.data,
              })}
            />
            <InternRunListHeaderCell
              columnId="task"
              filterValue={filters.text.task ?? ""}
              kind="text"
              label={internRunListFilterColumnLabels.task}
              onFilterChange={handleFilterChange}
              options={getInternRunListFilterOptions({
                columnId: "task",
                runs: runsQuery.data,
              })}
            />
            <InternRunListHeaderCell
              columnId="record"
              filterValue={filters.text.record ?? ""}
              kind="text"
              label={internRunListFilterColumnLabels.record}
              onFilterChange={handleFilterChange}
              options={getInternRunListFilterOptions({
                columnId: "record",
                runs: runsQuery.data,
              })}
            />
            <InternRunListHeaderCell
              bounds={getInternRunListRangeFilterBounds({
                columnId: "attempt",
                runs: runsQuery.data,
              })}
              columnId="attempt"
              filterValue={filters.ranges.attempt}
              kind="range"
              label={internRunListFilterColumnLabels.attempt}
              onFilterChange={handleRangeFilterChange}
            />
            <InternRunListHeaderCell
              bounds={getInternRunListRangeFilterBounds({
                columnId: "duration",
                runs: runsQuery.data,
              })}
              columnId="duration"
              filterValue={filters.ranges.duration}
              kind="range"
              label={internRunListFilterColumnLabels.duration}
              onFilterChange={handleRangeFilterChange}
            />
            <InternRunListHeaderCell
              bounds={getInternRunListRangeFilterBounds({
                columnId: "toolCalls",
                runs: runsQuery.data,
              })}
              columnId="toolCalls"
              filterValue={filters.ranges.toolCalls}
              kind="range"
              label={internRunListFilterColumnLabels.toolCalls}
              onFilterChange={handleRangeFilterChange}
            />
            <InternRunListHeaderCell
              bounds={getInternRunListRangeFilterBounds({
                columnId: "tokensIn",
                runs: runsQuery.data,
              })}
              columnId="tokensIn"
              filterValue={filters.ranges.tokensIn}
              kind="range"
              label={internRunListFilterColumnLabels.tokensIn}
              onFilterChange={handleRangeFilterChange}
            />
            <InternRunListHeaderCell
              bounds={getInternRunListRangeFilterBounds({
                columnId: "cachedTokens",
                runs: runsQuery.data,
              })}
              columnId="cachedTokens"
              filterValue={filters.ranges.cachedTokens}
              kind="range"
              label={internRunListFilterColumnLabels.cachedTokens}
              onFilterChange={handleRangeFilterChange}
            />
            <InternRunListHeaderCell
              bounds={getInternRunListRangeFilterBounds({
                columnId: "tokensOut",
                runs: runsQuery.data,
              })}
              columnId="tokensOut"
              filterValue={filters.ranges.tokensOut}
              kind="range"
              label={internRunListFilterColumnLabels.tokensOut}
              onFilterChange={handleRangeFilterChange}
            />
            <InternRunListHeaderCell
              bounds={getInternRunListRangeFilterBounds({
                columnId: "cost",
                runs: runsQuery.data,
              })}
              columnId="cost"
              filterValue={filters.ranges.cost}
              kind="range"
              label={internRunListFilterColumnLabels.cost}
              onFilterChange={handleRangeFilterChange}
            />
            <InternRunListHeaderCell
              columnId="started"
              filterValue={filters.text.started ?? ""}
              kind="text"
              label={internRunListFilterColumnLabels.started}
              onFilterChange={handleFilterChange}
              options={getInternRunListFilterOptions({
                columnId: "started",
                runs: runsQuery.data,
              })}
            />
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredRuns.length > 0 ? (
            filteredRuns.map((run) => (
              <InternRunListRow
                key={run.id}
                organizationSlug={organizationSlug}
                projectSlug={projectSlug}
                run={run}
              />
            ))
          ) : (
            <TableRow>
              <TableCell className="py-8 text-center text-muted-foreground" colSpan={15}>
                No intern runs match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </DataTable>
    </div>
  )
}
