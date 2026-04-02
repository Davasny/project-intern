"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/utils/cn"

type ProjectScopeNavLinkProps = {
  href: string
  label: string
}

export const ProjectScopeNavLink = ({
  href,
  label,
}: ProjectScopeNavLinkProps) => {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      className={cn(
        "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      href={href}
    >
      {label}
    </Link>
  )
}
