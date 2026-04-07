"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TableCell } from "@/components/ui/table"

const contextValuePreviewCharacterLimit = 200

const getContextValueText = (value: unknown) => {
  if (value === null) {
    return "null"
  }

  if (value === undefined) {
    return "—"
  }

  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  try {
    return JSON.stringify(value)
  } catch {
    return "[Unsupported value]"
  }
}

const getContextValueCodeBlockText = (value: unknown) => {
  if (value === undefined) {
    return "—"
  }

  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return String(value)
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return "[Unsupported value]"
  }
}

type RecordContextValueCellProps = {
  value: unknown
}

export const RecordContextValueCell = ({
  value,
}: RecordContextValueCellProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const fullValue = getContextValueText(value)
  const preview =
    fullValue.length > contextValuePreviewCharacterLimit
      ? `${fullValue.slice(0, contextValuePreviewCharacterLimit)}…`
      : fullValue
  const canExpand =
    fullValue.length > contextValuePreviewCharacterLimit ||
    (typeof value !== "string" && value !== null && value !== undefined)

  return (
    <TableCell>
      <div className="flex max-w-[20rem] flex-col gap-2">
        <span className="text-xs break-words whitespace-pre-wrap">{preview}</span>
        {canExpand ? (
          <>
            <Button
              className="w-fit"
              onClick={() => setIsDialogOpen(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              View
            </Button>
            <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
              <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Context value</DialogTitle>
                </DialogHeader>
                <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-3 text-xs whitespace-pre-wrap break-words">
                  {getContextValueCodeBlockText(value)}
                </pre>
              </DialogContent>
            </Dialog>
          </>
        ) : null}
      </div>
    </TableCell>
  )
}
