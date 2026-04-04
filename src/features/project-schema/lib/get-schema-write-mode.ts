import { and, desc, eq, sql } from "drizzle-orm"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { recordTable } from "@/features/records/db"
import type { db } from "@/lib/db"

type SchemaWriteMode = "in_place" | "new_version"

type GetSchemaWriteModeResult = {
  activeVersion: {
    id: string
    version: number
    schemaDefinition: import("@/features/project-schema/schemas/project-schema-version").ProjectSchemaDefinition
  }
  mode: SchemaWriteMode
  recordCount: number
}

type DatabaseClient = Pick<typeof db, "execute" | "select">

type GetSchemaWriteModeParams = {
  database: DatabaseClient
  projectId: string
}

export const getSchemaWriteMode = async ({
  database,
  projectId,
}: GetSchemaWriteModeParams): Promise<GetSchemaWriteModeResult | null> => {
  const activeVersion = await database
    .select({
      id: projectSchemaVersionTable.id,
      schemaDefinition: projectSchemaVersionTable.schemaDefinition,
      version: projectSchemaVersionTable.version,
    })
    .from(projectSchemaVersionTable)
    .where(
      and(
        eq(projectSchemaVersionTable.projectId, projectId),
        eq(projectSchemaVersionTable.state, "accepted"),
      ),
    )
    .orderBy(desc(projectSchemaVersionTable.version))
    .limit(1)
    .then((rows) => rows[0] ?? null)

  if (!activeVersion) {
    return null
  }

  const [{ count }] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(recordTable)
    .where(eq(recordTable.projectId, projectId))

  const mode: SchemaWriteMode = count > 0 ? "new_version" : "in_place"

  return {
    activeVersion: {
      id: activeVersion.id,
      schemaDefinition: activeVersion.schemaDefinition,
      version: activeVersion.version,
    },
    mode,
    recordCount: count,
  }
}
