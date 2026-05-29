import type { Control } from "react-hook-form"
import { FormField, FormItem, FormMessage } from "@/components/ui/form"
import type { SchemaVersionFormValues } from "@/features/project-schema/schemas/schema-version-form-schema"

type SchemaFieldRequiredCheckboxProps = {
  control: Control<SchemaVersionFormValues>
  index: number
}

export const SchemaFieldRequiredCheckbox = ({
  control,
  index,
}: SchemaFieldRequiredCheckboxProps) => (
  <FormField
    control={control}
    name={`fields.${index}.required`}
    render={({ field }) => (
      <FormItem className="gap-1">
        <label className="flex items-center justify-center gap-2 text-xs font-medium text-foreground">
          <input
            checked={field.value}
            className="h-4 w-4 rounded border border-border"
            onChange={(event) => field.onChange(event.target.checked)}
            type="checkbox"
          />
          <span className="sr-only">Required field</span>
        </label>
        <FormMessage className="text-xs" />
      </FormItem>
    )}
  />
)
