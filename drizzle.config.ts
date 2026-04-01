import "dotenv/config"
import { defineConfig } from "drizzle-kit"

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://intern:intern@localhost:5433/project_intern"

export default defineConfig({
  dialect: "postgresql",
  schema: [
    "./src/features/auth/db.ts",
    "./src/features/projects/db.ts",
    "./src/features/project-schema/db.ts",
    "./src/features/records/db.ts",
    "./src/features/tasks/db.ts",
    "./src/features/task-records/db.ts",
    "./src/features/agent-runs/db.ts",
  ],
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
})
