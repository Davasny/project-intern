import { asc, eq } from "drizzle-orm"
import { projectTable } from "@/features/projects/db"
import { db } from "@/lib/db"

export const listOrganizationProjectsById = async (organizationId: string) =>
  db
    .select({
      displayName: projectTable.displayName,
      id: projectTable.id,
      slug: projectTable.slug,
    })
    .from(projectTable)
    .where(eq(projectTable.organizationId, organizationId))
    .orderBy(asc(projectTable.createdAt))
