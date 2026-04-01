import { z } from "zod"

export const organizationRoleSchema = z.enum(["owner", "member"])

export type OrganizationRole = z.infer<typeof organizationRoleSchema>
