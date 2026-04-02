type MetadataListItemProps = {
  label: string
  value: string
}

export const MetadataListItem = ({ label, value }: MetadataListItemProps) => (
  <div className="flex flex-col gap-1 rounded-2xl border border-border bg-muted/30 p-4">
    <dt className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
      {label}
    </dt>
    <dd className="text-foreground text-sm">{value}</dd>
  </div>
)
