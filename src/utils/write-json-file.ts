import { writeFile } from "node:fs/promises"

export const writeJsonFile = async (params: {
  filePath: string
  value: unknown
}) => {
  await writeFile(params.filePath, JSON.stringify(params.value, null, 2))
}
