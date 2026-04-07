"use client"

import Link from "next/link"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { cn } from "@/utils/cn"

type ExecutionPageNavigationProps = {
  activePage: "matrix" | "monitor" | "runs"
}

const navItems: Array<{
  id: ExecutionPageNavigationProps["activePage"]
  label: string
  route: "" | "/matrix" | "/runs"
}> = [
  {
    id: "monitor",
    label: "Monitor",
    route: "",
  },
  {
    id: "matrix",
    label: "Matrix",
    route: "/matrix",
  },
  {
    id: "runs",
    label: "Runs",
    route: "/runs",
  },
]

export const ExecutionPageNavigation = ({
  activePage,
}: ExecutionPageNavigationProps) => {
  const { organizationSlug, projectSlug } = useProjectScope()

  return (
    <nav className="flex flex-row gap-2 rounded-2xl border border-border bg-card p-1">
      {navItems.map((item) => (
        <Link
          className={cn(
            "rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
            item.id === activePage
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
          href={`/app/${organizationSlug}/${projectSlug}/execution${item.route}`}
          key={item.id}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
