import { getProjectDisabledSkillNames } from "@/features/opencode/lib/get-project-disabled-skill-names"
import { listDiskSkills } from "@/features/opencode/lib/list-disk-skills"

type GetEnabledProjectSkillNamesParams = {
  organizationId: string
  projectId: string
}

export const getEnabledProjectSkillNames = async ({
  organizationId,
  projectId,
}: GetEnabledProjectSkillNamesParams) => {
  const disabledSkillNames = await getProjectDisabledSkillNames(projectId)
  const { skills } = await listDiskSkills({
    disabledSkillNames,
    organizationId,
    projectId,
  })

  return skills.filter((skill) => skill.enabled).map((skill) => skill.name)
}
