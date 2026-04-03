import { and, eq } from "drizzle-orm"
import { HTTPException } from "hono/http-exception"
import { organization, organizationMembership } from "@/features/auth/db"
import { projectTable } from "@/features/projects/db"
import { recordTable } from "@/features/records/db"
import { db } from "@/lib/db"
import type { SessionVariables } from "@/lib/hono/middleware/session-guard"

export type UploadAccessContext = {
  organizationId: string
  organizationSlug: string
  projectId: string
  recordId: string
}

export const validateUploadAccess = async ({
  context,
  recordId,
}: {
  context: SessionVariables["session"]
  recordId: string
}): Promise<UploadAccessContext> => {
  if (!context?.user?.id) {
    throw new HTTPException(401, { message: "Unauthorized" })
  }

  const userId = context.user.id

  const result = await db
    .select({
      organizationId: organization.id,
      organizationSlug: organization.slug,
      projectId: projectTable.id,
      recordId: recordTable.id,
    })
    .from(recordTable)
    .innerJoin(projectTable, eq(recordTable.projectId, projectTable.id))
    .innerJoin(organization, eq(projectTable.organizationId, organization.id))
    .innerJoin(
      organizationMembership,
      eq(organizationMembership.organizationId, organization.id),
    )
    .where(
      and(
        eq(organizationMembership.userId, userId),
        eq(recordTable.id, recordId),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (!result) {
    throw new HTTPException(403, {
      message: "Forbidden: no access to this record",
    })
  }

  return {
    organizationId: result.organizationId,
    organizationSlug: result.organizationSlug,
    projectId: result.projectId,
    recordId: result.recordId,
  }
}
