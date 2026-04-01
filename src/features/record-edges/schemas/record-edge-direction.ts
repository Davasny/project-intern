import { z } from "zod"

export const recordEdgeDirectionSchema = z.enum(["outbound", "bidirectional"])

export type RecordEdgeDirection = z.infer<typeof recordEdgeDirectionSchema>
