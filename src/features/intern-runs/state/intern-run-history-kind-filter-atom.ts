import { atomWithHash } from "jotai-location"
import {
  type InternRunHistoryFilterKind,
  internRunHistoryDefaultFilterKinds,
  internRunHistoryFilterKinds,
} from "@/features/intern-runs/lib/intern-run-history-filter-kind"

const isInternRunHistoryFilterKind = (
  value: string,
): value is InternRunHistoryFilterKind =>
  internRunHistoryFilterKinds.some((kind) => kind === value)

const parseFilterKinds = (value: string) => {
  const parsedKinds = value.split(",").filter(isInternRunHistoryFilterKind)

  return parsedKinds.length > 0
    ? parsedKinds
    : [...internRunHistoryDefaultFilterKinds]
}

export const internRunHistoryKindFilterAtom = atomWithHash<
  Array<InternRunHistoryFilterKind>
>("historyKinds", [...internRunHistoryDefaultFilterKinds], {
  deserialize: parseFilterKinds,
  serialize: (value) => value.join(","),
  setHash: "replaceState",
})
