import { SidePanel } from "@/components/ui/side-panel/side-panel"
import { SidePanelHeader } from "@/components/ui/side-panel/side-panel-header"
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
  mode: "create" | "edit"
  organizationSlug: string
  onSubmitted: () => void
  projectSlug: string
  recordId: string
}

export const RelationEditorPanel = ({
  initialValues,
  mode,
  organizationSlug,
  onSubmitted,
  projectSlug,
  recordId,
}: RelationEditorPanelProps) => (
  <SidePanel>
    <SidePanelHeader>
      <h3 className="text-lg font-semibold text-slate-950">
        {mode === "create" ? "Create relation" : "Edit relation"}
      </h3>
      <p className="text-sm text-slate-500">
        Relation edits stay canonical, auditable, and limited to depth-1
        traversal reads.
      </p>
    </SidePanelHeader>
    <RelationForm
      initialValues={initialValues}
      onSubmitted={onSubmitted}
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
      recordId={recordId}
    />
  </SidePanel>
)
