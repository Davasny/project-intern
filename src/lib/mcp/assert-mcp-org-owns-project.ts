import { and, eq } from "drizzle-orm"
import { HTTPException } from "hono/http-exception"
import { projectTable } from "@/features/projects/db"
import { db } from "@/lib/db"

type AssertMcpOrgOwnsProjectParams = {
  organizationId: string
  projectId: string
}

export const assertMcpOrgOwnsProject = async ({
  organizationId,
  projectId,
}: AssertMcpOrgOwnsProjectParams) => {
  const project = await db
    .select({ organizationId: projectTable.organizationId })
    .from(projectTable)
    .where(
      and(
        eq(projectTable.id, projectId),
        eq(projectTable.organizationId, organizationId),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (!project) {
    throw new HTTPException(403, {
      message: "Access denied: project does not belong to your organization.",
    })
  }

  return project
}
