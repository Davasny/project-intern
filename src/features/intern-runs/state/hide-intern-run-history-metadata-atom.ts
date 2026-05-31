import { atomWithHash } from "jotai-location"

export const hideInternRunHistoryMetadataAtom = atomWithHash<boolean>(
  "hideMetadata",
  true,
  {
    deserialize: (value) => value === "true",
    serialize: (value) => String(value),
    setHash: "replaceState",
  },
)
