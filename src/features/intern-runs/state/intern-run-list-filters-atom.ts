import { atomWithHash } from "jotai-location"
import { z } from "zod"
import {
  emptyInternRunListFilters,
  type InternRunListFilters,
} from "@/features/intern-runs/lib/intern-run-list-filters"

const rangeFilterSchema = z.object({
  max: z.number().nullable(),
  min: z.number().nullable(),
})

const internRunListFiltersSchema = z.object({
  ranges: z
    .object({
      attempt: rangeFilterSchema.optional(),
      cost: rangeFilterSchema.optional(),
      duration: rangeFilterSchema.optional(),
      temperature: rangeFilterSchema.optional(),
      tokensIn: rangeFilterSchema.optional(),
      tokensOut: rangeFilterSchema.optional(),
      toolCalls: rangeFilterSchema.optional(),
    })
    .optional(),
  text: z
    .object({
      model: z.string().optional(),
      provider: z.string().optional(),
      record: z.string().optional(),
      selectedIntern: z.string().optional(),
      started: z.string().optional(),
      state: z.string().optional(),
      task: z.string().optional(),
    })
    .optional(),
})

const normalizeFilters = (filters: InternRunListFilters) => {
  const normalizedFilters: InternRunListFilters = {
    ranges: {},
    text: {},
  }

  if (filters.text.model?.trim()) {
    normalizedFilters.text.model = filters.text.model.trim()
  }
  if (filters.text.provider?.trim()) {
    normalizedFilters.text.provider = filters.text.provider.trim()
  }
  if (filters.text.record?.trim()) {
    normalizedFilters.text.record = filters.text.record.trim()
  }
  if (filters.text.selectedIntern?.trim()) {
    normalizedFilters.text.selectedIntern = filters.text.selectedIntern.trim()
  }
  if (filters.text.started?.trim()) {
    normalizedFilters.text.started = filters.text.started.trim()
  }
  if (filters.text.state?.trim()) {
    normalizedFilters.text.state = filters.text.state.trim()
  }
  if (filters.text.task?.trim()) {
    normalizedFilters.text.task = filters.text.task.trim()
  }

  if (filters.ranges.attempt) {
    normalizedFilters.ranges.attempt = filters.ranges.attempt
  }
  if (filters.ranges.cost) {
    normalizedFilters.ranges.cost = filters.ranges.cost
  }
  if (filters.ranges.duration) {
    normalizedFilters.ranges.duration = filters.ranges.duration
  }
  if (filters.ranges.temperature) {
    normalizedFilters.ranges.temperature = filters.ranges.temperature
  }
  if (filters.ranges.tokensIn) {
    normalizedFilters.ranges.tokensIn = filters.ranges.tokensIn
  }
  if (filters.ranges.tokensOut) {
    normalizedFilters.ranges.tokensOut = filters.ranges.tokensOut
  }
  if (filters.ranges.toolCalls) {
    normalizedFilters.ranges.toolCalls = filters.ranges.toolCalls
  }

  return normalizedFilters
}

const parseFilters = (value: string): InternRunListFilters => {
  try {
    const parsedValue: unknown = JSON.parse(value)
    const parsedFilters = internRunListFiltersSchema.safeParse(parsedValue)

    return parsedFilters.success
      ? normalizeFilters({
          ranges: parsedFilters.data.ranges ?? {},
          text: parsedFilters.data.text ?? {},
        })
      : emptyInternRunListFilters
  } catch {
    return emptyInternRunListFilters
  }
}

export const internRunListFiltersAtom = atomWithHash<InternRunListFilters>(
  "runFilters",
  emptyInternRunListFilters,
  {
    deserialize: parseFilters,
    serialize: (value) => JSON.stringify(normalizeFilters(value)),
    setHash: "replaceState",
  },
)
