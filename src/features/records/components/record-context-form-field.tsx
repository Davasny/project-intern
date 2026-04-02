import type { UseFormReturn } from "react-hook-form"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ProjectSchemaField } from "@/features/project-schema/schemas/project-schema-field"

type RecordFormValues = {
  context: Record<string, unknown>
  name: string
}

type RecordContextFormFieldProps = {
  form: UseFormReturn<RecordFormValues>
  schemaField: ProjectSchemaField
}

const getFieldDescription = (schemaField: ProjectSchemaField) => {
  if (schemaField.type === "enum") {
    return schemaField.config.enumOptions.join(", ")
  }

  return schemaField.description
}

export const RecordContextFormField = ({
  form,
  schemaField,
}: RecordContextFormFieldProps) => (
  <FormField
    control={form.control}
    name={`context.${schemaField.key}`}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{schemaField.label}</FormLabel>
        <FormControl>
          {schemaField.type === "long_text" ? (
            <Textarea
              name={field.name}
              onBlur={field.onBlur}
              onChange={field.onChange}
              rows={schemaField.config.multilineRows ?? 5}
              value={String(field.value ?? "")}
            />
          ) : schemaField.type === "boolean" ? (
            <input
              checked={field.value === true}
              className="h-4 w-4 rounded border border-border"
              onBlur={field.onBlur}
              onChange={(event) => field.onChange(event.target.checked)}
              ref={field.ref}
              type="checkbox"
            />
          ) : schemaField.type === "enum" ? (
            <Select
              name={field.name}
              onValueChange={field.onChange}
              value={typeof field.value === "string" ? field.value : ""}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {schemaField.config.enumOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : schemaField.type === "json" ? (
            <Textarea
              name={field.name}
              onBlur={field.onBlur}
              onChange={field.onChange}
              rows={8}
              value={String(field.value ?? "")}
            />
          ) : (
            <Input
              {...field}
              type={
                schemaField.type === "number"
                  ? "number"
                  : schemaField.type === "date"
                    ? "date"
                    : schemaField.type === "datetime"
                      ? "datetime-local"
                      : schemaField.type === "url"
                        ? "url"
                        : schemaField.type === "email"
                          ? "email"
                          : "text"
              }
              value={String(field.value ?? "")}
            />
          )}
        </FormControl>
        <FormDescription>{getFieldDescription(schemaField)}</FormDescription>
        <FormMessage />
      </FormItem>
    )}
  />
)
