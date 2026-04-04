import { readdir } from "node:fs/promises"
import path from "node:path"
import { getProjectSkillsDirectory } from "@/lib/config/backend"

type DiskSkill = {
  name: string
  description: string
  directoryName: string
  skillMdPath: string
}

const parseSkillFrontmatter = (
  content: string,
): { name?: string; description?: string } => {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) {
    return {}
  }

  const frontmatter = match[1]
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m)
  const descriptionMatch = frontmatter.match(/^description:\s*(.+)$/m)

  return {
    name: nameMatch ? nameMatch[1].trim() : undefined,
    description: descriptionMatch ? descriptionMatch[1].trim() : undefined,
  }
}

export const listDiskSkills = async (
  organizationId: string,
  projectId: string,
): Promise<{ skillsDirectory: string; skills: DiskSkill[] }> => {
  const skillsDirectory = getProjectSkillsDirectory(organizationId, projectId)

  let entries: string[] = []
  try {
    entries = await readdir(skillsDirectory)
  } catch {
    return { skillsDirectory, skills: [] }
  }

  const skills: DiskSkill[] = []

  for (const entry of entries) {
    const skillDir = path.join(skillsDirectory, entry)
    const skillMdPath = path.join(skillDir, "SKILL.md")

    let skillMdContent: string
    try {
      const { readFile } = await import("node:fs/promises")
      skillMdContent = await readFile(skillMdPath, "utf-8")
    } catch {
      continue
    }

    const { name, description } = parseSkillFrontmatter(skillMdContent)

    if (!name || !description) {
      continue
    }

    skills.push({
      name,
      description,
      directoryName: entry,
      skillMdPath,
    })
  }

  return { skillsDirectory, skills }
}
