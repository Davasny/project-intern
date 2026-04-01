import { databaseConfig } from "@/lib/config/database"

export const pgBosserOptions = {
  connectionString: databaseConfig.DATABASE_URL,
}
