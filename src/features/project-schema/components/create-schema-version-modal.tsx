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
}

export const CreateSchemaVersionModal = ({
  initialSchemaDefinition,
}: CreateSchemaVersionModalProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary">
          Create new version
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create schema change</DialogTitle>
          <DialogDescription>
            Save as draft for review, or create and accept a new schema version
            immediately.
          </DialogDescription>
        </DialogHeader>
        <SchemaVersionForm
          initialSchemaDefinition={initialSchemaDefinition}
          key={initialSchemaDefinition.fields.map((f) => f.key).join(",")}
          onSuccess={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
