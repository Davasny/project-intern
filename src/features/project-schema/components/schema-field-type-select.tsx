import { Controller, type Control } from "react-hook-form"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SchemaVersionFormValues } from "@/features/project-schema/schemas/schema-version-form-schema"

type SchemaFieldTypeSelectProps = {
  control: Control<SchemaVersionFormValues>
  index: number
}

export const SchemaFieldTypeSelect = ({
  control,
  index,
}: SchemaFieldTypeSelectProps) => (
  <Controller
    control={control}
    name={`fields.${index}.type`}
    render={({ field, fieldState }) => (
      <Field className="gap-1">
        <FieldContent>
          <FieldLabel className="sr-only">Type</FieldLabel>
        </FieldContent>
        <Select name={field.name} onValueChange={field.onChange} value={field.value}>
          <SelectTrigger className="h-9 w-full min-w-36">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="long_text">Long text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="boolean">Boolean</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="datetime">Datetime</SelectItem>
              <SelectItem value="url">URL</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="enum">Enum</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="string_array">String array</SelectItem>
              <SelectItem value="number_array">Number array</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        {fieldState.error ? (
          <p className="text-destructive text-xs font-medium">
            {fieldState.error.message}
          </p>
        ) : null}
      </Field>
    )}
  />
)
