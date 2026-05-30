"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { cn } from "@/lib/utils"
import { useTRPC } from "@/lib/trpc/client"

type OpencodeSkillListItemProps = {
  skill: {
    description: string
    enabled: boolean
    name: string
  }
}

export const OpencodeSkillListItem = ({ skill }: OpencodeSkillListItemProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const updateSkillEnabledMutation = useMutation(
    trpc.opencode.updateSkillEnabled.mutationOptions({
      onError: () => {
        toast.error(`Failed to update ${skill.name}.`)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.opencode.listSkills.queryFilter({
            organizationSlug,
            projectSlug,
          }),
        )
      },
    }),
  )

  const handleEnabledChange = async (enabled: boolean) => {
    await updateSkillEnabledMutation.mutateAsync({
      enabled,
      organizationSlug,
      projectSlug,
      skillName: skill.name,
    })
  }

  return (
    <li
      className={cn(
        "flex flex-row items-center justify-between gap-4 rounded-lg border border-border bg-background p-4 transition-colors",
        skill.enabled ? "border-l-4 border-l-emerald-500" : "bg-muted/30",
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-row items-center gap-2">
          <span className="font-mono text-sm font-semibold text-foreground">
            {skill.name}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              skill.enabled
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-muted text-muted-foreground",
            )}
          >
            {skill.enabled ? "Allowed" : "Denied"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {skill.description}
        </span>
      </div>
      <Switch
        aria-label={`Toggle ${skill.name}`}
        checked={skill.enabled}
        disabled={updateSkillEnabledMutation.isPending}
        onCheckedChange={handleEnabledChange}
      />
    </li>
  )
}
