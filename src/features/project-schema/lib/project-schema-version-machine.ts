import { machine } from "machin"
import { withDrizzlePg } from "machin/drizzle/pg"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"
import { db } from "@/lib/db"

type ProjectSchemaVersionMachineContext = {
  parentVersionId: string | null
  projectId: string
  proposedBy: string | null
  schemaDefinition: ProjectSchemaDefinition
  version: number
}

type ProjectSchemaVersionTransitionEvent = {
  parentVersionId: string | null
  projectId: string
  proposedBy: string | null
  schemaDefinition: ProjectSchemaDefinition
  version: number
}

const projectSchemaVersionMachineDefinition =
  machine<ProjectSchemaVersionMachineContext>().define({
    initial: "created",
    states: {
      accepted: {
        entry: (_context, event: ProjectSchemaVersionTransitionEvent) => ({
          parentVersionId: event.parentVersionId,
          projectId: event.projectId,
          proposedBy: event.proposedBy,
          schemaDefinition: event.schemaDefinition,
          version: event.version,
        }),
        onSuccess: { target: "accepted" },
      },
      created: {
        entry: (_context, event: ProjectSchemaVersionTransitionEvent) => ({
          parentVersionId: event.parentVersionId,
          projectId: event.projectId,
          proposedBy: event.proposedBy,
          schemaDefinition: event.schemaDefinition,
          version: event.version,
        }),
        on: {
          accept: { target: "accepted" },
          reject: { target: "rejected" },
        },
        onSuccess: { target: "created" },
      },
      rejected: {
        entry: (_context, event: ProjectSchemaVersionTransitionEvent) => ({
          parentVersionId: event.parentVersionId,
          projectId: event.projectId,
          proposedBy: event.proposedBy,
          schemaDefinition: event.schemaDefinition,
          version: event.version,
        }),
        onSuccess: { target: "rejected" },
      },
    },
  })

export const projectSchemaVersionMachine = withDrizzlePg(
  projectSchemaVersionMachineDefinition,
  {
    db,
    table: projectSchemaVersionTable,
  },
)
