import type { AgentConfig } from "@opencode-ai/sdk"
import { agentBrowserScreenshotPathPattern } from "@/features/opencode/lib/agent-browser-screenshot-path-pattern"
import type { SkillPermission } from "@/features/opencode/lib/build-skill-permission"
import { buildSkillPermission } from "@/features/opencode/lib/build-skill-permission"
import { canOpencodeSessionUseTaskTool } from "@/features/opencode/lib/can-opencode-session-use-task-tool"
import type { OpencodeSessionPurpose } from "@/features/opencode/lib/opencode-session-purpose"

type PermissionAction = "allow" | "ask" | "deny"
type PermissionRuleSet = Record<string, PermissionAction>

type InternPermission = Omit<
  NonNullable<AgentConfig["permission"]>,
  "external_directory"
> & {
  external_directory?: PermissionAction | PermissionRuleSet
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
    external_directory: {
      [agentBrowserScreenshotPathPattern]: "allow",
      "*": "deny",
    },
    skill: buildSkillPermission(enabledSkillNames),
  }

  if (canOpencodeSessionUseTaskTool(sessionPurpose)) {
    permission.task = "allow"
  }

  return permission
}
