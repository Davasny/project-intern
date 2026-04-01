import type { ProjectSchemaField } from "@/features/project-schema/schemas/project-schema-field"

const systemProjectSchemaFields: ProjectSchemaField[] = [
  {
    config: {
      enumOptions: [],
      max: null,
      min: null,
      multilineRows: null,
    },
    defaultValue: null,
    description: "Canonical record identifier.",
    isSystem: true,
    key: "id",
    label: "Record ID",
    required: true,
    type: "text",
  },
  {
    config: {
      enumOptions: [],
      max: null,
      min: null,
      multilineRows: null,
    },
    defaultValue: null,
    description: "Primary display name for the record.",
    isSystem: true,
    key: "name",
    label: "Record name",
    required: true,
    type: "text",
  },
]

export const getSystemProjectSchemaFields = () => systemProjectSchemaFields
