import { z } from "zod"

export const recordEdgeStateSchema = z.enum(["active", "inactive"])

export type RecordEdgeState = z.infer<typeof recordEdgeStateSchema>
