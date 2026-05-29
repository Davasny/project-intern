import { ChevronDown, Trash2 } from "lucide-react"
import { useState } from "react"
import type { UseFormReturn } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { TableCell, TableRow } from "@/components/ui/table"
import { SchemaFieldAdvancedRow } from "@/features/project-schema/components/schema-field-advanced-row"
import { SchemaFieldRequiredCheckbox } from "@/features/project-schema/components/schema-field-required-checkbox"
import { SchemaFieldTypeSelect } from "@/features/project-schema/components/schema-field-type-select"
import type { SchemaVersionFormValues } from "@/features/project-schema/schemas/schema-version-form-schema"
import { cn } from "@/lib/utils"

type SchemaFieldTableRowProps = {
  form: UseFormReturn<SchemaVersionFormValues>
  index: number
  onRemove: () => void
}

export const SchemaFieldTableRow = ({
  form,
  index,
  onRemove,
}: SchemaFieldTableRowProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <>
      <TableRow className="bg-card hover:bg-muted/30">
        <TableCell className="w-[28%] px-3 py-2">
          <FormField
            control={form.control}
            name={`fields.${index}.label`}
            render={({ field }) => (
              <FormItem className="gap-1">
                <FormLabel className="sr-only">Label</FormLabel>
                <FormControl>
                  <Input className="h-9" placeholder="Website" {...field} />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </TableCell>
        <TableCell className="w-[28%] px-3 py-2">
          <FormField
            control={form.control}
            name={`fields.${index}.key`}
            render={({ field }) => (
              <FormItem className="gap-1">
                <FormLabel className="sr-only">Key</FormLabel>
                <FormControl>
                  <Input className="h-9 font-mono" placeholder="website" {...field} />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </TableCell>
        <TableCell className="w-[22%] px-3 py-2">
          <SchemaFieldTypeSelect control={form.control} index={index} />
        </TableCell>
        <TableCell className="w-20 px-3 py-2 text-center">
          <SchemaFieldRequiredCheckbox control={form.control} index={index} />
        </TableCell>
        <TableCell className="w-24 px-3 py-2">
          <Button
            className="h-9 w-full justify-between px-2 text-xs"
            onClick={() => setIsExpanded(!isExpanded)}
            type="button"
            variant="outline"
          >
            Details
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform",
                isExpanded && "rotate-180",
              )}
            />
          </Button>
        </TableCell>
        <TableCell className="w-14 px-3 py-2 text-right">
          <Button
            aria-label="Remove field"
            className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            type="button"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
      {isExpanded ? <SchemaFieldAdvancedRow form={form} index={index} /> : null}
    </>
  )
}
