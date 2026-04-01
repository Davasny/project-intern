import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { agentRunTable } from "@/features/agent-runs/db"
import { authSchema } from "@/features/auth/db"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { projectTable } from "@/features/projects/db"
import { activityLogTable, recordEdgeTable } from "@/features/record-edges/db"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskDescriptionRevisionTable, taskTable } from "@/features/tasks/db"
import { databaseConfig } from "@/lib/config/database"

const schema = {
  ...authSchema,
  agentRunTable,
  activityLogTable,
  projectTable,
  projectSchemaVersionTable,
  recordTable,
  recordEdgeTable,
  taskDescriptionRevisionTable,
  taskRecordTable,
  taskTable,
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
