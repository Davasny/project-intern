import { Slot } from "@radix-ui/react-slot"
import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/utils/cn"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
  variant?: "primary" | "secondary" | "ghost"
}

export const Button = ({
  asChild = false,
  className,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) => {
  const Component = asChild ? Slot : "button"

  return (
    <Component
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-60",
        variant === "primary" && "bg-slate-900 text-white hover:bg-slate-700",
        variant === "secondary" &&
          "bg-slate-100 text-slate-900 hover:bg-slate-200",
        variant === "ghost" &&
          "bg-transparent text-slate-700 hover:bg-slate-100",
        className,
      )}
      type={type}
      {...props}
    />
  )
}
