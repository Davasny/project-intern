import { sql } from "drizzle-orm"
import type { db } from "@/lib/db"

type DatabaseClient = Pick<typeof db, "execute">

type GenerateUuidV7ValuesParams = {
  count: number
  database: DatabaseClient
}

type GeneratedIdRow = {
  id: string
}

export const generateUuidV7Values = async ({
  count,
  database,
}: GenerateUuidV7ValuesParams) => {
  if (count <= 0) {
    return []
  }

  const generatedIds = await database.execute<GeneratedIdRow>(sql`
    select uuidv7() as id
    from generate_series(1, ${count})
  `)

  return generatedIds.rows.map((row) => row.id)
}
