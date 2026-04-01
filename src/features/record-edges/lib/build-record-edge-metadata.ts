import type { RelationMetadataInput } from "@/features/record-edges/schemas/relation-metadata"

export const buildRecordEdgeMetadata = ({
  confidence,
  notes,
  source,
}: RelationMetadataInput) => {
  const metadata: Record<string, unknown> = {}

  if (confidence !== null) {
    metadata.confidence = confidence
  }

  if (notes.length > 0) {
    metadata.notes = notes
  }

  if (source.length > 0) {
    metadata.source = source
  }

  return metadata
}
