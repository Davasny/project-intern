"use client"

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import type { ComponentProps } from "react"
import { cn } from "@/utils/cn"

export const DropdownMenu = DropdownMenuPrimitive.Root

export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

export const DropdownMenuContent = ({
  className,
  sideOffset = 8,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      className={cn(
        "z-50 min-w-48 rounded-2xl border border-border bg-popover p-1.5",
        className,
      )}
      sideOffset={sideOffset}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
)

type DropdownMenuItemProps = ComponentProps<
  typeof DropdownMenuPrimitive.Item
> & {
  variant: "default" | "destructive"
}

export const DropdownMenuItem = ({
  className,
  inset,
  variant,
  ...props
}: DropdownMenuItemProps & { inset?: boolean }) => (
  <DropdownMenuPrimitive.Item
    className={cn(
      "relative flex cursor-default select-none items-center rounded-xl px-3 py-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      variant === "default" && "text-slate-700 focus:bg-slate-100",
      variant === "destructive" &&
        "text-rose-600 focus:bg-rose-50 focus:text-rose-700",
      className,
    )}
    {...props}
  />
)
