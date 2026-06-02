export type SkillPermission = Record<string, "allow" | "deny">

export const buildSkillPermission = (skillNames: string[]): SkillPermission => {
  const permission: SkillPermission = {
    "*": "deny",
  }

  for (const skillName of skillNames) {
    permission[skillName] = "allow"
  }

  return permission
}
