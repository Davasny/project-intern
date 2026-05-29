import type { UseFormReturn } from "react-hook-form"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { TableCell, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { SchemaVersionFormValues } from "@/features/project-schema/schemas/schema-version-form-schema"

type SchemaFieldAdvancedRowProps = {
  form: UseFormReturn<SchemaVersionFormValues>
  index: number
}

export const SchemaFieldAdvancedRow = ({
  form,
  index,
}: SchemaFieldAdvancedRowProps) => {
  const fieldType = form.watch(`fields.${index}.type`)

  return (
    <TableRow className="bg-muted/20">
      <TableCell className="px-3 py-3" colSpan={6}>
        <div className="grid gap-3 md:grid-cols-6">
          <FormField
            control={form.control}
            name={`fields.${index}.defaultValue`}
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="text-xs">Default value</FormLabel>
                <FormControl>
                  <Input className="h-9" placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`fields.${index}.config.min`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Min</FormLabel>
                <FormControl>
                  <Input className="h-9" placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`fields.${index}.config.max`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Max</FormLabel>
                <FormControl>
                  <Input className="h-9" placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          {fieldType === "long_text" ? (
            <FormField
              control={form.control}
              name={`fields.${index}.config.multilineRows`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Textarea rows</FormLabel>
                  <FormControl>
                    <Input className="h-9" placeholder="5" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          ) : null}
          {fieldType === "enum" ? (
            <FormField
              control={form.control}
              name={`fields.${index}.config.enumOptions`}
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-xs">Enum options</FormLabel>
                  <FormControl>
                    <Input
                      className="h-9"
                      placeholder="lead, prospect, active"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          ) : null}
          <FormField
            control={form.control}
            name={`fields.${index}.description`}
            render={({ field }) => (
              <FormItem className="md:col-span-6">
                <FormLabel className="text-xs">Description</FormLabel>
                <FormControl>
                  <Textarea className="min-h-20" rows={2} {...field} />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>
      </TableCell>
    </TableRow>
  )
}
