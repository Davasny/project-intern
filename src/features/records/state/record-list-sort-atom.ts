import { atomWithHash } from "jotai-location"
import {
  defaultRecordListSort,
  parseRecordListSort,
  type RecordListSort,
  serializeRecordListSort,
} from "@/features/records/lib/record-list-sort"

export const recordListSortAtom = atomWithHash<RecordListSort>(
  "recordSort",
  defaultRecordListSort,
  {
    deserialize: parseRecordListSort,
    serialize: serializeRecordListSort,
    setHash: "replaceState",
  },
)
