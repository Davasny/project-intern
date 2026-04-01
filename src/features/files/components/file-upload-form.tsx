"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { readBrowserFileAsBase64 } from "@/features/files/lib/read-browser-file-as-base64"
import { useTRPC } from "@/lib/trpc/client"

const fileUploadFormSchema = z.object({
  file: z.custom<FileList>(
    (value) => value instanceof FileList && value.length > 0,
    "Choose a file to upload.",
  ),
})

type FileUploadFormValues = z.infer<typeof fileUploadFormSchema>

type FileUploadFormProps = {
  organizationSlug: string
  projectSlug: string
  recordId: string
}

export const FileUploadForm = ({
  organizationSlug,
  projectSlug,
  recordId,
}: FileUploadFormProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const form = useForm<FileUploadFormValues>({
    defaultValues: {
      file: undefined,
    },
    resolver: zodResolver(fileUploadFormSchema),
  })

  const createFileMutation = useMutation(
    trpc.files.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.files.list.queryFilter({
            organizationSlug,
            projectSlug,
            recordId,
          }),
        )

        form.reset()
      },
    }),
  )

  const handleSubmit = form.handleSubmit(async (values) => {
    const selectedFile = values.file.item(0)

    if (!selectedFile) {
      return
    }

    const contentBase64 = await readBrowserFileAsBase64(selectedFile)

    await createFileMutation.mutateAsync({
      contentBase64,
      mimeType: selectedFile.type || "application/octet-stream",
      organizationSlug,
      originalFileName: selectedFile.name,
      projectSlug,
      recordId,
    })
  })

  return (
    <Form {...form}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <FormField
          control={form.control}
          name="file"
          render={({ field: { onChange, value: _value, ...field } }) => (
            <FormItem>
              <FormLabel>Upload canonical source file</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onChange={(event) => onChange(event.target.files)}
                  type="file"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button disabled={createFileMutation.isPending} type="submit">
          {createFileMutation.isPending ? "Uploading file..." : "Upload file"}
        </Button>
      </form>
    </Form>
  )
}
