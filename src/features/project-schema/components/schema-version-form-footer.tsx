import { Button } from "@/components/ui/button"

type SchemaVersionFormFooterProps = {
  createDraftPending: boolean
  createVersionPending: boolean
  isSubmitting: boolean
  onCreateDraft: () => void
  totalRecordCount: number
}

export const SchemaVersionFormFooter = ({
  createDraftPending,
  createVersionPending,
  isSubmitting,
  onCreateDraft,
  totalRecordCount,
}: SchemaVersionFormFooterProps) => (
  <div className="sticky bottom-0 z-20 flex flex-row justify-end gap-2 border-t border-border bg-card/95 px-1 py-4 backdrop-blur">
    <Button
      disabled={isSubmitting}
      onClick={onCreateDraft}
      type="button"
      variant="outline"
    >
      {createDraftPending
        ? totalRecordCount === 0
          ? "Saving draft..."
          : "Creating draft..."
        : totalRecordCount === 0
          ? "Save draft"
          : "Create draft"}
    </Button>
    <Button disabled={isSubmitting} type="submit">
      {createVersionPending
        ? totalRecordCount === 0
          ? "Applying changes..."
          : "Creating schema version..."
        : totalRecordCount === 0
          ? "Apply changes"
          : "Create schema version"}
    </Button>
  </div>
)
