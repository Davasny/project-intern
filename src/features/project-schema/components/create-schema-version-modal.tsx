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

type CreateSchemaVersionModalProps = {
  initialSchemaDefinition: ProjectSchemaDefinition
  organizationSlug: string
  projectSlug: string
}

export const CreateSchemaVersionModal = ({
  initialSchemaDefinition,
  organizationSlug,
  projectSlug,
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
          <DialogTitle>Create schema version</DialogTitle>
          <DialogDescription>
            Changes become the next active schema version for this project.
          </DialogDescription>
        </DialogHeader>
        <SchemaVersionForm
          initialSchemaDefinition={initialSchemaDefinition}
          key={initialSchemaDefinition.fields.map((f) => f.key).join(",")}
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          onSuccess={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
