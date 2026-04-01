import { Queue } from "pg-bosser"
import { z } from "zod"
import { pgBosserOptions } from "@/features/execution/lib/pg-bosser-options"

export const workspaceMaintenanceQueueName = "workspace-maintenance"

export const workspaceMaintenanceQueuePayloadSchema = z.object({
  projectId: z.string().uuid().nullable(),
})

export type WorkspaceMaintenanceQueuePayload = z.infer<
  typeof workspaceMaintenanceQueuePayloadSchema
>

export const workspaceMaintenanceQueue =
  new Queue<WorkspaceMaintenanceQueuePayload>({
    name: workspaceMaintenanceQueueName,
    pgBossOptions: pgBosserOptions,
  })
