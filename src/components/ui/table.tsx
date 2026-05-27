import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react"
import { cn } from "@/lib/utils"

export const Table = ({
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) => (
  <table
    className={cn("w-full border-collapse text-sm", className)}
    {...props}
  />
)

export const TableHead = ({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("bg-muted", className)} {...props} />
)

export const TableBody = ({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn(className)} {...props} />
)

export const TableRow = ({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("border-b border-border", className)} {...props} />
)

export const TableHeader = ({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      "text-muted-foreground px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide",
      className,
    )}
    {...props}
  />
)

export const TableCell = ({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td
    className={cn("text-foreground px-4 py-3 align-top", className)}
    {...props}
  />
)
