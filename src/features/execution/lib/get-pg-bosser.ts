import { PgBoss } from "pg-boss"
import { databaseConfig } from "@/lib/config/database"

const globalForPgBosser = globalThis as {
  projectInternPgBosser?: PgBoss
}

export const getPgBosser = () => {
  if (!globalForPgBosser.projectInternPgBosser) {
    globalForPgBosser.projectInternPgBosser = new PgBoss(
      databaseConfig.DATABASE_URL,
    )
  }

  return globalForPgBosser.projectInternPgBosser
}
