import type { Control, UseFormReturn } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

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
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">Custom field</h3>
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
        <FormField
          control={control}
          name={`fields.${index}.type`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <FormControl>
                <Select {...field}>
                  <option value="text">Text</option>
                  <option value="long_text">Long text</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="date">Date</option>
                  <option value="datetime">Datetime</option>
                  <option value="url">URL</option>
                  <option value="email">Email</option>
                  <option value="enum">Enum</option>
                  <option value="json">JSON</option>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
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
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                checked={field.value}
                className="h-4 w-4 rounded border border-slate-300"
                onChange={(event) => field.onChange(event.target.checked)}
                type="checkbox"
              />
              Required field
            </label>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
