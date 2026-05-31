import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { artifactTable } from "@/features/artifacts/db"
import { authSchema } from "@/features/auth/schema"
import { internRunTable } from "@/features/intern-runs/db"
import { opencodeServerTable } from "@/features/opencode/db"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { projectTable } from "@/features/projects/db"
import { recordEdgeTable } from "@/features/record-edges/db"
import { recordTable } from "@/features/records/db"
import { taskDescriptionRevisionTable, taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { databaseConfig } from "@/lib/config/database"

const schema = {
  ...authSchema,
  artifactTable,
  internRunTable,
  projectTable,
  projectSchemaVersionTable,
  recordTable,
  recordEdgeTable,
  taskDescriptionRevisionTable,
  workRecordTable,
  taskTable,
  opencodeServerTable,
}

const globalForDatabase = globalThis as {
  projectInternDatabasePool?: Pool
}

const pool =
  globalForDatabase.projectInternDatabasePool ??
  new Pool({
    connectionString: databaseConfig.DATABASE_URL,
  })

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.projectInternDatabasePool = pool
}

export const db = drizzle({
  client: pool,
  schema,
})
