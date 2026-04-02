"use client"

import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import {
  type ComponentPropsWithoutRef,
  createContext,
  type HTMLAttributes,
  useContext,
  useId,
} from "react"
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form"
import { cn } from "@/utils/cn"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => (
  <FormFieldContext.Provider value={{ name: props.name }}>
    <Controller {...props} />
  </FormFieldContext.Provider>
)

type FormItemContextValue = {
  id: string
}

const FormItemContext = createContext<FormItemContextValue | null>(null)

const FormItem = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  const id = useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div className={cn("flex flex-col gap-2", className)} {...props} />
    </FormItemContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = useContext(FormFieldContext)
  const itemContext = useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  if (!fieldContext) {
    throw new Error("useFormField must be used inside FormField")
  }

  const fieldState = getFieldState(fieldContext.name, formState)
  const itemId = itemContext?.id ?? fieldContext.name

  return {
    error: fieldState.error,
    formItemId: `${itemId}-form-item`,
    formDescriptionId: `${itemId}-form-item-description`,
    formMessageId: `${itemId}-form-item-message`,
    name: fieldContext.name,
  }
}

const FormLabel = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof LabelPrimitive.Root>) => {
  const { error, formItemId } = useFormField()

  return (
    <LabelPrimitive.Root
      className={cn(
        "text-sm font-medium",
        error && "text-destructive",
        className,
      )}
      htmlFor={formItemId}
      {...props}
    />
  )
}

const FormControl = ({ ...props }: ComponentPropsWithoutRef<typeof Slot>) => {
  const { error, formDescriptionId, formItemId, formMessageId } = useFormField()

  return (
    <Slot
      aria-describedby={
        error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId
      }
      aria-invalid={Boolean(error)}
      id={formItemId}
      {...props}
    />
  )
}

const FormDescription = ({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      id={formDescriptionId}
      {...props}
    />
  )
}

const FormMessage = ({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) => {
  const { error, formMessageId } = useFormField()
  const body = error?.message ? String(error.message) : props.children

  if (!body) {
    return null
  }

  return (
    <p
      className={cn("text-destructive text-sm font-medium", className)}
      id={formMessageId}
      {...props}
    >
      {body}
    </p>
  )
}

export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
}
