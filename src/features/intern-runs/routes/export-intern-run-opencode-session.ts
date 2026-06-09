import { readFile } from "node:fs/promises"
import { TRPCError } from "@trpc/server"
import type { MiddlewareHandler } from "hono"
import { HTTPException } from "hono/http-exception"
import { z } from "zod"
import { exportOpencodeSessionJson } from "@/features/intern-runs/lib/export-opencode-session-json"
import { getInternRunOpencodeExportTarget } from "@/features/intern-runs/lib/get-intern-run-opencode-export-target"
import {
  requireSession,
  type SessionVariables,
} from "@/lib/hono/middleware/session-guard"
import { logger } from "@/lib/logger"

const exportInternRunOpencodeSessionSchema = z.object({
  internRunId: z.string().uuid(),
  organizationSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
})

const getHttpStatusFromTrpcError = (error: TRPCError) => {
  if (error.code === "BAD_REQUEST") {
    return 400
  }

  if (error.code === "UNAUTHORIZED") {
    return 401
  }

  if (error.code === "FORBIDDEN") {
    return 403
  }

  if (error.code === "NOT_FOUND") {
    return 404
  }

  return 500
}

const formatAttachmentFileName = (sessionReference: string) =>
  `${sessionReference.replace(/["\\]/g, "_")}.json`

const copyBufferToResponseBody = (buffer: Buffer): Uint8Array<ArrayBuffer> => {
  const body = new Uint8Array(new ArrayBuffer(buffer.byteLength))
  body.set(buffer)

  return body
}

export const exportInternRunOpencodeSessionHandler: MiddlewareHandler<{
  Variables: SessionVariables
}> = async (context) => {
  const session = requireSession(context)
  const parsedInput = exportInternRunOpencodeSessionSchema.safeParse({
    internRunId: context.req.param("internRunId"),
    organizationSlug: context.req.query("organizationSlug"),
    projectSlug: context.req.query("projectSlug"),
  })

  if (!parsedInput.success) {
    throw new HTTPException(400, { message: "Invalid export request." })
  }

  let target: Awaited<ReturnType<typeof getInternRunOpencodeExportTarget>>

  try {
    target = await getInternRunOpencodeExportTarget({
      internRunId: parsedInput.data.internRunId,
      organizationSlug: parsedInput.data.organizationSlug,
      projectSlug: parsedInput.data.projectSlug,
      userId: session.user.id,
    })
  } catch (error) {
    if (error instanceof TRPCError) {
      throw new HTTPException(getHttpStatusFromTrpcError(error), {
        message: error.message,
      })
    }

    throw error
  }

  try {
    const exportFile = await exportOpencodeSessionJson({
      directory: target.directory,
      sessionReference: target.sessionReference,
    })
    let body: Uint8Array<ArrayBuffer>

    try {
      const json = await readFile(exportFile.path)
      body = copyBufferToResponseBody(json)
    } finally {
      await exportFile.cleanup()
    }

    return context.body(body, 200, {
      "Cache-Control": "no-store, max-age=0",
      "Content-Disposition": `attachment; filename="${formatAttachmentFileName(target.sessionReference)}"`,
      "Content-Length": String(body.byteLength),
      "Content-Type": "application/json; charset=utf-8",
      Pragma: "no-cache",
    })
  } catch (error) {
    logger.error(
      {
        directory: target.directory,
        error,
        internRunId: target.internRunId,
        sessionReference: target.sessionReference,
      },
      "Failed to export OpenCode session",
    )

    throw new HTTPException(500, {
      message: "OpenCode session export could not be generated.",
    })
  }
}
