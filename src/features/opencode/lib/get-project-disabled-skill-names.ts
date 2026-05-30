import { eq } from "drizzle-orm"
import { projectTable } from "@/features/projects/db"
import { db } from "@/lib/db"

export const getProjectDisabledSkillNames = async (projectId: string) => {
  const project = await db
    .select({ disabledSkillNames: projectTable.disabledSkillNames })
    .from(projectTable)
    .where(eq(projectTable.id, projectId))
    .then((rows) => rows[0] ?? null)

  return project?.disabledSkillNames ?? []
}
