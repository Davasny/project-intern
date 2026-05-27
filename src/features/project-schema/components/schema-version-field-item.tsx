"use client"

import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ProjectSchemaField } from "@/features/project-schema/schemas/project-schema-field"
import { cn } from "@/utils/cn"

type SchemaVersionFieldItemProps = {
  field: ProjectSchemaField
}

export const SchemaVersionFieldItem = ({
  field,
}: SchemaVersionFieldItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-muted/50">
      <button
        className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">{field.label}</h3>
          <Badge className="bg-muted text-foreground">
            {field.type}
          </Badge>
          {field.required ? (
            <Badge className="bg-tone-warning-bg text-tone-warning-foreground">
              required
            </Badge>
          ) : null}
          {field.isSystem ? (
            <Badge className="bg-tone-info-bg text-tone-info-foreground">
              system
            </Badge>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isExpanded && "rotate-180",
          )}
        />
      </button>
      {isExpanded ? (
        <div className="flex flex-col gap-2 border-t border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Key:</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
                {field.key}
              </code>
            </div>
            {field.defaultValue !== null ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Default:</span>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
                  {JSON.stringify(field.defaultValue)}
                </code>
              </div>
            ) : null}
          </div>
          {field.description ? (
            <p className="text-sm text-muted-foreground">{field.description}</p>
          ) : null}
          {field.config.min !== null || field.config.max !== null ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {field.config.min !== null ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Min:</span>
                  <span className="text-xs font-medium text-foreground">
                    {field.config.min}
                  </span>
                </div>
              ) : null}
              {field.config.max !== null ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Max:</span>
                  <span className="text-xs font-medium text-foreground">
                    {field.config.max}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
          {field.config.enumOptions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-xs text-muted-foreground">Options:</span>
              {field.config.enumOptions.map((option) => (
                <Badge
                  className="bg-muted text-foreground"
                  key={option}
                >
                  {option}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
