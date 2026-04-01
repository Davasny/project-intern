import type { InputHTMLAttributes } from "react"
import { cn } from "@/utils/cn"

export const Input = ({
  className,
  type = "text",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-900",
      className,
    )}
    type={type}
    {...props}
  />
)
