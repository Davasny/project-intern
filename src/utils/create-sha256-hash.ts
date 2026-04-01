import { createHash } from "node:crypto"

export const createSha256Hash = (value: Buffer) =>
  createHash("sha256").update(value).digest("hex")
