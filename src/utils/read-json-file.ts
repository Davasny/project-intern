import { readFile } from "node:fs/promises"
import type { ZodType } from "zod"

export const readJsonFile = async <TValue>(params: {
  filePath: string
  schema: ZodType<TValue>
}) => {
  const content = await readFile(params.filePath, "utf8")
  return params.schema.parse(JSON.parse(content))
}
