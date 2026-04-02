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
          ? "bg-slate-900 text-white hover:bg-slate-800"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
      )}
      href={href}
    >
      {label}
    </Link>
  )
}
