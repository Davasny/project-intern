import { atomWithHash } from "jotai-location"

export const selectedInternRunHistoryEventIdAtom = atomWithHash<string | null>(
  "historyEvent",
  null,
  {
    deserialize: (value) => (value.length > 0 ? value : null),
    serialize: (value) => value ?? "",
    setHash: "replaceState",
  },
)
