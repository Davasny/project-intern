"use client"

import { ChevronDown } from "lucide-react"
import { useState } from "react"
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
    <div className="rounded-lg border border-slate-200 bg-slate-50/50">
      <button
        className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-slate-100/50"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium text-slate-900">{field.label}</h3>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
            {field.type}
          </span>
          {field.required ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              required
            </span>
          ) : null}
          {field.isSystem ? (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              system
            </span>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-500 transition-transform",
            isExpanded && "rotate-180",
          )}
        />
      </button>
      {isExpanded ? (
        <div className="flex flex-col gap-2 border-t border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">Key:</span>
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">
                {field.key}
              </code>
            </div>
            {field.defaultValue !== null ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500">Default:</span>
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">
                  {JSON.stringify(field.defaultValue)}
                </code>
              </div>
            ) : null}
          </div>
          {field.description ? (
            <p className="text-sm text-slate-600">{field.description}</p>
          ) : null}
          {field.config.min !== null || field.config.max !== null ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {field.config.min !== null ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500">Min:</span>
                  <span className="text-xs font-medium text-slate-700">
                    {field.config.min}
                  </span>
                </div>
              ) : null}
              {field.config.max !== null ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500">Max:</span>
                  <span className="text-xs font-medium text-slate-700">
                    {field.config.max}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
          {field.config.enumOptions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-xs text-slate-500">Options:</span>
              {field.config.enumOptions.map((option) => (
                <span
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                  key={option}
                >
                  {option}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
