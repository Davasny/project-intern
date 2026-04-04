"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SchemaVersionForm } from "@/features/project-schema/components/schema-version-form"
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"
import { useProjectScope } from "@/features/projects/context/project-scope-context"

type CreateSchemaVersionModalProps = {
  initialSchemaDefinition: ProjectSchemaDefinition
  totalRecordCount: number
}

export const CreateSchemaVersionModal = ({
  initialSchemaDefinition,
  totalRecordCount,
}: CreateSchemaVersionModalProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary">
          {totalRecordCount > 0 ? "Create new version" : "Edit schema"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {totalRecordCount > 0 ? "Create schema version" : "Edit schema"}
          </DialogTitle>
          <DialogDescription>
            {totalRecordCount > 0
              ? "Save as draft for review, or create and accept a new schema version immediately."
              : "Save changes as draft for review, or apply them immediately to the active schema."}
          </DialogDescription>
        </DialogHeader>
        <SchemaVersionForm
          initialSchemaDefinition={initialSchemaDefinition}
          key={initialSchemaDefinition.fields.map((f) => f.key).join(",")}
          onSuccess={() => setIsOpen(false)}
          totalRecordCount={totalRecordCount}
        />
      </DialogContent>
    </Dialog>
  )
}
