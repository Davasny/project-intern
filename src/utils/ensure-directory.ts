import { mkdir } from "node:fs/promises"

export const ensureDirectory = async (directoryPath: string) => {
  await mkdir(directoryPath, { recursive: true })
}
