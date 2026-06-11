"use client"

import { EyeIcon, EyeOffIcon } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { TaskDefinitionVersionChangePreview } from "@/features/tasks/components/task-definition-version-change-preview"
import { TaskDefinitionVersionDiffRow } from "@/features/tasks/components/task-definition-version-diff-row"

type TaskDefinitionVersionItemProps = {
  version: {
    changes: {
      field: string
      label: string
      after: string
      before: string
    }[]
    createdAt: Date
    id: string
    model: string | null
    schemaVersion: number
    temperature: number | null
    title: string
    versionNumber: number
  }
}

export const TaskDefinitionVersionItem = ({
  version,
}: TaskDefinitionVersionItemProps) => {
  const [collapseUnchanged, setCollapseUnchanged] = useState(false)

  return (
    <li className="rounded-2xl border bg-background/80 p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-row items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-row items-center gap-2">
              <Badge className="border-foreground/20 bg-foreground text-background">
                v{version.versionNumber}
              </Badge>
              <h3 className="font-semibold text-foreground">{version.title}</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Frozen {version.createdAt.toLocaleString()}
            </p>
          </div>
          <div className="flex flex-row flex-wrap justify-end gap-2 text-xs">
            <Badge>Schema {version.schemaVersion}</Badge>
            <Badge>{version.model ?? "Project model"}</Badge>
            <Badge>
              {version.temperature !== null
                ? `Temp ${version.temperature.toFixed(1)}`
                : "Default temperature"}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {version.changes.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
              Initial accepted task definition snapshot.
            </p>
          ) : (
            version.changes.map((change) => (
              <TaskDefinitionVersionChangePreview
                change={change}
                key={change.field}
              />
            ))
          )}
        </div>
        {version.changes.length > 0 ? (
          <div className="flex flex-row justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline">
                  View complete diff
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
                <DialogHeader>
                  <div className="flex flex-row items-center justify-between gap-3">
                    <DialogTitle>Version {version.versionNumber} diff</DialogTitle>
                    <Button
                      aria-label={
                        collapseUnchanged
                          ? "Show unchanged lines"
                          : "Collapse non-changed lines"
                      }
                      onClick={() => setCollapseUnchanged(!collapseUnchanged)}
                      size="icon"
                      title={
                        collapseUnchanged
                          ? "Show unchanged lines"
                          : "Collapse non-changed lines"
                      }
                      type="button"
                      variant="ghost"
                    >
                      {collapseUnchanged ? <EyeIcon /> : <EyeOffIcon />}
                    </Button>
                  </div>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                  {version.changes.map((change) => (
                    <TaskDefinitionVersionDiffRow
                      change={change}
                      collapseUnchanged={collapseUnchanged}
                      key={change.field}
                    />
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </div>
    </li>
  )
}
