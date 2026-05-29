"use client"

import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import type { ProjectSchemaField } from "@/features/project-schema/schemas/project-schema-field"
import { cn } from "@/lib/utils"

type SchemaActiveFieldRowProps = {
  field: ProjectSchemaField
}

const formatDefaultValue = (value: unknown) => {
  if (value === null) {
    return "—"
  }

  return JSON.stringify(value)
}

const formatRange = (field: ProjectSchemaField) => {
  if (field.config.min === null && field.config.max === null) {
    return "—"
  }

  if (field.config.min !== null && field.config.max !== null) {
    return `${field.config.min}–${field.config.max}`
  }

  if (field.config.min !== null) {
    return `Min ${field.config.min}`
  }

  return `Max ${field.config.max}`
}

export const SchemaActiveFieldRow = ({ field }: SchemaActiveFieldRowProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasDetails =
    field.description.length > 0 ||
    field.defaultValue !== null ||
    field.config.enumOptions.length > 0 ||
    field.config.min !== null ||
    field.config.max !== null ||
    field.config.multilineRows !== null

  return (
    <>
      <TableRow className="hover:bg-muted/30">
        <TableCell>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="font-medium text-foreground">{field.label}</span>
            <code className="text-xs text-muted-foreground">{field.key}</code>
          </div>
        </TableCell>
        <TableCell>
          <Badge className="bg-muted text-foreground">{field.type}</Badge>
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1.5">
            {field.required ? (
              <Badge className="bg-tone-warning-bg text-tone-warning-foreground">
                required
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">Optional</span>
            )}
            {field.isSystem ? (
              <Badge className="bg-tone-info-bg text-tone-info-foreground">
                system
              </Badge>
            ) : null}
          </div>
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {formatDefaultValue(field.defaultValue)}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {formatRange(field)}
        </TableCell>
        <TableCell className="text-right">
          <Button
            disabled={!hasDetails}
            onClick={() => setIsExpanded(!isExpanded)}
            size="sm"
            type="button"
            variant="ghost"
          >
            Details
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isExpanded && "rotate-180",
              )}
            />
          </Button>
        </TableCell>
      </TableRow>
      {isExpanded ? (
        <TableRow className="bg-muted/20">
          <TableCell className="py-4" colSpan={6}>
            <div className="grid gap-3 text-sm md:grid-cols-[minmax(0,1fr)_minmax(220px,auto)]">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Description
                </span>
                <p className="text-foreground">
                  {field.description || "No description provided."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {field.config.enumOptions.map((option) => (
                  <Badge className="bg-card text-foreground" key={option}>
                    {option}
                  </Badge>
                ))}
                {field.config.multilineRows !== null ? (
                  <Badge className="bg-card text-foreground">
                    {field.config.multilineRows} rows
                  </Badge>
                ) : null}
              </div>
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  )
}
