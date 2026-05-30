import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { listDiskSkills } from "@/features/opencode/lib/list-disk-skills"
import { projectTable } from "@/features/projects/db"
import { db } from "@/lib/db"

type UpdateProjectSkillEnabledParams = {
  enabled: boolean
  organizationId: string
  projectId: string
  skillName: string
}

export const updateProjectSkillEnabled = async ({
  enabled,
  organizationId,
  projectId,
  skillName,
}: UpdateProjectSkillEnabledParams) => {
  const project = await db
    .select({ disabledSkillNames: projectTable.disabledSkillNames })
    .from(projectTable)
    .where(eq(projectTable.id, projectId))
    .then((rows) => rows[0] ?? null)

  if (!project) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project settings were not found.",
    })
  }

  const diskSkills = await listDiskSkills({
    disabledSkillNames: project.disabledSkillNames,
    organizationId,
    projectId,
  })
  const skillExists = diskSkills.skills.some(
    (skill) => skill.name === skillName,
  )

  if (!skillExists) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Skill was not found on disk for this project.",
    })
  }

  const disabledSkillNames = enabled
    ? project.disabledSkillNames.filter((name) => name !== skillName)
    : Array.from(new Set([...project.disabledSkillNames, skillName]))

  await db
    .update(projectTable)
    .set({ disabledSkillNames })
    .where(eq(projectTable.id, projectId))

  return { disabledSkillNames }
}
