import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { SchemaVersionProposalItem } from "@/features/project-schema/components/schema-version-proposal-item"

type SchemaProposal = Parameters<typeof SchemaVersionProposalItem>[0]["proposal"]

type SchemaProposalsSectionProps = {
  onCompare: (proposalId: string) => void
  proposals: SchemaProposal[]
}

export const SchemaProposalsSection = ({
  onCompare,
  proposals,
}: SchemaProposalsSectionProps) => (
  <SectionCard>
    <SectionCardHeader>
      <h2 className="text-lg font-semibold text-foreground">
        Pending schema proposals
      </h2>
      <p className="text-sm text-muted-foreground">
        Intern proposals wait in created state until accepted or rejected.
      </p>
    </SectionCardHeader>
    <SectionCardContent className="flex flex-col divide-y divide-border/70">
      {proposals.length > 0 ? (
        proposals.map((proposal) => (
          <SchemaVersionProposalItem
            key={proposal.id}
            onCompare={() => onCompare(proposal.id)}
            proposal={proposal}
          />
        ))
      ) : (
        <p className="text-sm text-muted-foreground">
          No schema proposals are waiting for review.
        </p>
      )}
    </SectionCardContent>
  </SectionCard>
)
