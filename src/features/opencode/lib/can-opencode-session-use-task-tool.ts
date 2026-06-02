import type { OpencodeSessionPurpose } from "@/features/opencode/lib/opencode-session-purpose"

export const canOpencodeSessionUseTaskTool = (
  sessionPurpose: OpencodeSessionPurpose,
) => sessionPurpose === "debug" || sessionPurpose === "dump"
