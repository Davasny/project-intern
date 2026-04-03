"use client"

import { useQuery } from "@tanstack/react-query"
import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

export const OpencodeSkillsPage = () => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const [copied, setCopied] = useState(false)

  const skillsQuery = useQuery(
    trpc.opencode.listSkills.queryOptions({
      organizationSlug,
      projectSlug,
    }),
  )

  const handleCopyPath = async () => {
    if (!skillsQuery.data?.skillsDirectory) return
    await navigator.clipboard.writeText(skillsQuery.data.skillsDirectory)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (skillsQuery.isLoading) {
    return <LoadingState label="Loading OpenCode skills..." />
  }

  if (!skillsQuery.data) {
    return <LoadingState label="OpenCode skills could not be loaded." />
  }

  const { skillsDirectory, skills } = skillsQuery.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            OpenCode Skills
          </h1>
          <p className="text-sm text-muted-foreground">
            Reusable agent behavior definitions discovered at runtime.
          </p>
        </div>
      </PageHeader>

      <SectionCard>
        <SectionCardHeader>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              Skills directory
            </span>
            <span className="text-xs text-muted-foreground">
              Copy skill folders here — OpenCode discovers them automatically
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyPath}
            className="gap-2"
          >
            {copied ? (
              <CheckIcon className="size-3.5" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
            {copied ? "Copied" : "Copy path"}
          </Button>
        </SectionCardHeader>
        <SectionCardContent>
          <code className="text-xs text-muted-foreground break-all">
            {skillsDirectory}
          </code>
        </SectionCardContent>
      </SectionCard>

      <SectionCard>
        <SectionCardHeader>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              Expected structure
            </span>
          </div>
        </SectionCardHeader>
        <SectionCardContent>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
            {`📁 <skillsDirectory>/
└── 📁 <skill-name>/
    └── 📄 SKILL.md    # required — name & description in frontmatter
    └── 📁 scripts/   # optional — auxiliary scripts (e.g. Python)
    └── 📁 templates/ # optional — prompt templates`}
          </pre>
        </SectionCardContent>
      </SectionCard>

      <SectionCard>
        <SectionCardHeader>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              Available skills
            </span>
            <span className="text-xs text-muted-foreground">
              {skills.length === 0
                ? "No skills found — add skill folders to the directory above"
                : `${skills.length} skill${skills.length === 1 ? "" : "s"} discovered`}
            </span>
          </div>
        </SectionCardHeader>
        <SectionCardContent>
          {skills.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No skills found. Drop a skill folder into the directory above and
              refresh to see it here.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {skills.map((skill) => (
                <li
                  key={skill.name}
                  className="flex flex-col gap-1 border-b border-border pb-3 last:border-0 last:pb-0 last:mb-0"
                >
                  <span className="text-sm font-medium text-foreground">
                    {skill.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {skill.description}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCardContent>
      </SectionCard>
    </div>
  )
}
