import type { AgentConfig } from "@opencode-ai/sdk"
import type { SkillPermission } from "@/features/opencode/lib/build-skill-permission"
import { buildSkillPermission } from "@/features/opencode/lib/build-skill-permission"
import { canOpencodeSessionUseTaskTool } from "@/features/opencode/lib/can-opencode-session-use-task-tool"
import type { OpencodeSessionPurpose } from "@/features/opencode/lib/opencode-session-purpose"

type PermissionAction = "allow" | "ask" | "deny"

type InternPermission = NonNullable<AgentConfig["permission"]> & {
  skill: SkillPermission
  task?: PermissionAction
}

export const buildInternPermission = ({
  basePermission,
  enabledSkillNames,
  sessionPurpose,
}: {
  basePermission: NonNullable<AgentConfig["permission"]>
  enabledSkillNames: string[]
  sessionPurpose: OpencodeSessionPurpose
}): InternPermission => {
  const permission: InternPermission = {
    ...basePermission,
    skill: buildSkillPermission(enabledSkillNames),
  }

  if (canOpencodeSessionUseTaskTool(sessionPurpose)) {
    permission.task = "allow"
  }

  return permission
}
