import { z } from "zod"

export const workspaceMaintenanceQueueName = "workspace-maintenance"

export const workspaceMaintenanceQueuePayloadSchema = z.object({
  projectId: z.string().uuid().nullable(),
})

export type WorkspaceMaintenanceQueuePayload = z.infer<
  typeof workspaceMaintenanceQueuePayloadSchema
>
