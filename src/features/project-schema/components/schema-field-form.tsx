import { type Control, Controller, type UseFormReturn } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import {
  FormControl,
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
import { SectionCard } from "@/components/ui/section-card/section-card"

export type SchemaVersionFormValues = {
  fields: Array<{
    config: {
      enumOptions: string
      max: string
      min: string
      multilineRows: string
    }
    defaultValue: string
    description: string
    key: string
    label: string
    required: boolean
    type:
      | "text"
      | "long_text"
      | "number"
      | "boolean"
      | "date"
      | "datetime"
      | "url"
      | "email"
      | "enum"
      | "json"
      | "string_array"
      | "number_array"
  }>
}

type SchemaFieldFormProps = {
  control: Control<SchemaVersionFormValues>
  form: UseFormReturn<SchemaVersionFormValues>
  index: number
  onRemove: () => void
}

export const SchemaFieldForm = ({
  control,
  form,
  index,
  onRemove,
}: SchemaFieldFormProps) => {
  const fieldType = form.watch(`fields.${index}.type`)

  return (
    <SectionCard>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Custom field</h3>
        <Button onClick={onRemove} type="button" variant="ghost">
          Remove
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={control}
          name={`fields.${index}.label`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label</FormLabel>
              <FormControl>
                <Input placeholder="Website" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`fields.${index}.key`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Key</FormLabel>
              <FormControl>
                <Input placeholder="website" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Controller
          name={`fields.${index}.type`}
          control={control}
          render={({ field }) => (
            <Field orientation="responsive">
              <FieldContent>
                <FieldLabel htmlFor="form-rhf-select-language">Type</FieldLabel>
              </FieldContent>

              <Select
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full">
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
            </Field>
          )}
        />

        <FormField
          control={control}
          name={`fields.${index}.defaultValue`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default value</FormLabel>
              <FormControl>
                <Input placeholder="Optional" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`fields.${index}.config.min`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Min</FormLabel>
              <FormControl>
                <Input placeholder="Optional" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`fields.${index}.config.max`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max</FormLabel>
              <FormControl>
                <Input placeholder="Optional" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {fieldType === "long_text" ? (
          <FormField
            control={control}
            name={`fields.${index}.config.multilineRows`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Textarea rows</FormLabel>
                <FormControl>
                  <Input placeholder="5" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}
        {fieldType === "enum" ? (
          <FormField
            control={control}
            name={`fields.${index}.config.enumOptions`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Enum options</FormLabel>
                <FormControl>
                  <Input placeholder="lead, prospect, active" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}
      </div>
      <FormField
        control={control}
        name={`fields.${index}.description`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`fields.${index}.required`}
        render={({ field }) => (
          <FormItem>
            <label className="flex items-center gap-3 text-sm font-medium text-foreground">
              <input
                checked={field.value}
                className="h-4 w-4 rounded border border-border"
                onChange={(event) => field.onChange(event.target.checked)}
                type="checkbox"
              />
              Required field
            </label>
            <FormMessage />
          </FormItem>
        )}
      />
    </SectionCard>
  )
}
