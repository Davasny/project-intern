export type TaskDefinitionVersionSource = {
  descriptionMarkdown: string
  id: string
  model: string | null
  schemaVersion: number
  sourceSchemaVersionId: string | null
  targetSchemaVersionId: string | null
  temperature: number | null
  title: string
}

export type TaskDefinitionVersionChange = {
  field: string
  label: string
  after: string
  before: string
}
