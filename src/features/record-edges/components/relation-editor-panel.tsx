import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RelationForm } from "@/features/record-edges/components/relation-form"
import type { RelationType } from "@/features/record-edges/lib/relation-type-rules"

type RelationEditorPanelProps = {
  initialValues: {
    confidence: string
    direction: "bidirectional" | "outbound"
    notes: string
    recordEdgeId: string | null
    relationType: RelationType
    source: string
    targetProjectSlug: string
    targetRecordId: string
  }
  isOpen: boolean
  mode: "create" | "edit"
  onOpenChange: (isOpen: boolean) => void
  onSubmitted: () => void
  recordId: string
}

export const RelationEditorPanel = ({
  initialValues,
  isOpen,
  mode,
  onOpenChange,
  onSubmitted,
  recordId,
}: RelationEditorPanelProps) => (
  <Dialog onOpenChange={onOpenChange} open={isOpen}>
    <DialogContent className="max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {mode === "create" ? "Create relation" : "Edit relation"}
        </DialogTitle>
        <DialogDescription>
          Relation edits stay canonical, auditable, and limited to depth-1
          traversal reads.
        </DialogDescription>
      </DialogHeader>
      <RelationForm
        initialValues={initialValues}
        onSubmitted={onSubmitted}
        recordId={recordId}
      />
    </DialogContent>
  </Dialog>
)
