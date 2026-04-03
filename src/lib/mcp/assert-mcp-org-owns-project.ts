import { and, eq } from "drizzle-orm"
import { HTTPException } from "hono/http-exception"
import { projectTable } from "@/features/projects/db"
import { db } from "@/lib/db"
import { getMcpScope } from "@/lib/mcp/mcp-scope-storage"

type AssertMcpOrgOwnsProjectParams = {
  projectId: string
}

export const assertMcpOrgOwnsProject = async ({
  projectId,
}: AssertMcpOrgOwnsProjectParams) => {
  const { organizationId: callerOrgId } = getMcpScope()

  const project = await db
    .select({ organizationId: projectTable.organizationId })
    .from(projectTable)
    .where(
      and(
        eq(projectTable.id, projectId),
        eq(projectTable.organizationId, callerOrgId),
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
