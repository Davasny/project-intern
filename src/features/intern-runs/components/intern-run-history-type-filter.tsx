import { FilterIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  internRunHistoryFilterKindLabels,
  type InternRunHistoryFilterKind,
  internRunHistoryFilterKinds,
} from "@/features/intern-runs/lib/intern-run-history-filter-kind"

type InternRunHistoryTypeFilterProps = {
  selectedFilterKinds: Array<InternRunHistoryFilterKind>
  onSelectedFilterKindsChange: (
    selectedFilterKinds: Array<InternRunHistoryFilterKind>,
  ) => void
}

const getFilterLabel = (selectedFilterKinds: Array<InternRunHistoryFilterKind>) =>
  selectedFilterKinds.length === internRunHistoryFilterKinds.length
    ? "All types"
    : `${selectedFilterKinds.length.toLocaleString()} types`

const toggleKind = ({
  checked,
  kind,
  selectedFilterKinds,
}: {
  checked: boolean
  kind: InternRunHistoryFilterKind
  selectedFilterKinds: Array<InternRunHistoryFilterKind>
}) => {
  if (checked) {
    return internRunHistoryFilterKinds.filter(
      (filterKind) =>
        filterKind === kind || selectedFilterKinds.includes(filterKind),
    )
  }

  return selectedFilterKinds.filter((filterKind) => filterKind !== kind)
}

export const InternRunHistoryTypeFilter = ({
  selectedFilterKinds,
  onSelectedFilterKindsChange,
}: InternRunHistoryTypeFilterProps) => {
  const allSelected = selectedFilterKinds.length === internRunHistoryFilterKinds.length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild={true}>
        <Button className="gap-2 rounded-full" size="sm" variant="outline">
          <FilterIcon className="size-3.5" />
          {getFilterLabel(selectedFilterKinds)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Entry type</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={allSelected}
          onCheckedChange={(checked) =>
            onSelectedFilterKindsChange(
              checked ? [...internRunHistoryFilterKinds] : [],
            )
          }
        >
          All
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {internRunHistoryFilterKinds.map((kind) => (
          <DropdownMenuCheckboxItem
            checked={selectedFilterKinds.includes(kind)}
            key={kind}
            onCheckedChange={(checked) =>
              onSelectedFilterKindsChange(
                toggleKind({ checked, kind, selectedFilterKinds }),
              )
            }
          >
            {internRunHistoryFilterKindLabels[kind]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
