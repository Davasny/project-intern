import { eq } from "drizzle-orm"
import { projectTable } from "@/features/projects/db"
import { db } from "@/lib/db"

type UpdateProjectAutopickParams = {
  isAutopickEnabled: boolean
  projectId: string
}

export const updateProjectAutopick = async ({
  isAutopickEnabled,
  projectId,
}: UpdateProjectAutopickParams) => {
  const [project] = await db
    .update(projectTable)
    .set({ isAutopickEnabled })
    .where(eq(projectTable.id, projectId))
    .returning({
      id: projectTable.id,
      isAutopickEnabled: projectTable.isAutopickEnabled,
    })

  return project ?? null
}
