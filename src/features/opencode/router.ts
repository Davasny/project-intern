import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { dumpDebugSessions } from "@/features/opencode/lib/dump-debug-sessions"
import {
  stopInteractiveServer,
  withOpencodeForOrg,
} from "@/features/opencode/lib/get-opencode-client"
import { getProjectDisabledSkillNames } from "@/features/opencode/lib/get-project-disabled-skill-names"
import { listDiskSkills } from "@/features/opencode/lib/list-disk-skills"
import {
  spawnDebugSession,
  stopDebugSession,
} from "@/features/opencode/lib/spawn-debug-session"
import { spawnDumpSession } from "@/features/opencode/lib/spawn-dump-session"
import {
  listSessionsOnExternalServer,
  spawnSession,
} from "@/features/opencode/lib/spawn-session"
import { updateProjectSkillEnabled } from "@/features/opencode/lib/update-project-skill-enabled"
import {
  resolveSessionDumpScope,
  sessionDumpScopeSchema,
} from "@/features/opencode/schemas/session-dump-scope"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { getProjectSkillsDirectory } from "@/lib/config/backend"
import { protectedProcedure, router } from "@/lib/trpc/init"

const projectScopeSchema = z.object({
  organizationSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
})

export const opencodeRouter = router({
  listSkills: protectedProcedure
    .input(projectScopeSchema)
    .query(async ({ ctx, input }) => {
      const project = await ensureProjectAccess({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      })

      if (!project) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this project.",
        })
      }

      const disabledSkillNames = await getProjectDisabledSkillNames(project.id)
      const { skillsDirectory, skills } = await listDiskSkills({
        disabledSkillNames,
        organizationId: project.organizationId,
        projectId: project.id,
      })

      return {
        skillsDirectory,
        skills,
      }
    }),
  updateSkillEnabled: protectedProcedure
    .input(
      projectScopeSchema.extend({
        enabled: z.boolean(),
        skillName: z.string().trim().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProjectAccess({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      })

      if (!project) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this project.",
        })
      }

      return updateProjectSkillEnabled({
        enabled: input.enabled,
        organizationId: project.organizationId,
        projectId: project.id,
        skillName: input.skillName,
      })
    }),
  getSkillsRoot: protectedProcedure
    .input(projectScopeSchema)
    .query(async ({ ctx, input }) => {
      const project = await ensureProjectAccess({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      })

      if (!project) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this project.",
        })
      }

      return {
        skillsDirectory: getProjectSkillsDirectory(
          project.organizationId,
          project.id,
        ),
      }
    }),
  spawnSession: protectedProcedure
    .input(
      projectScopeSchema.extend({
        title: z.string().trim().min(1).default("Interactive session"),
        taskId: z.string().uuid().optional(),
        recordId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProjectAccess({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      })

      if (!project) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this project.",
        })
      }

      if (input.taskId && input.recordId) {
        return spawnDebugSession({
          organizationId: project.organizationId,
          projectId: project.id,
          taskId: input.taskId,
          recordId: input.recordId,
          title: input.title,
        })
      }

      return spawnSession({
        organizationId: project.organizationId,
        projectId: project.id,
        title: input.title,
      })
    }),
  spawnDumpSession: protectedProcedure
    .input(
      projectScopeSchema.extend({
        title: z.string().trim().min(1).default("Debug session dump"),
        taskId: z.string().uuid().optional(),
        recordId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProjectAccess({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      })

      if (!project) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this project.",
        })
      }

      return spawnDumpSession({
        organizationId: project.organizationId,
        projectId: project.id,
        scope: resolveSessionDumpScope({
          recordId: input.recordId,
          taskId: input.taskId,
        }),
        title: input.title,
      })
    }),
  stopSession: protectedProcedure
    .input(
      z.object({
        serverId: z.string().uuid().optional(),
        internRunId: z.string().uuid().optional(),
        workRecordId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      let performed = false

      if (input.internRunId && input.workRecordId) {
        await stopDebugSession({
          internRunId: input.internRunId,
          workRecordId: input.workRecordId,
        })
        performed = true
      }

      if (input.serverId) {
        await stopInteractiveServer({
          serverId: input.serverId,
        })
        performed = true
      }

      if (!performed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Either serverId or (internRunId and workRecordId) must be provided.",
        })
      }
    }),
  dumpSessions: protectedProcedure
    .input(projectScopeSchema.extend({ scope: sessionDumpScopeSchema }))
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProjectAccess({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      })

      if (!project) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this project.",
        })
      }

      const scope = resolveSessionDumpScope(input.scope)

      return withOpencodeForOrg({
        fn: async ({ client }) =>
          dumpDebugSessions({
            client,
            projectId: project.id,
            scope,
          }),
        organizationId: project.organizationId,
        projectId: project.id,
        runtimeTemperature: null,
      })
    }),
  listSessions: protectedProcedure.input(projectScopeSchema).query(async () => {
    const sessions = await listSessionsOnExternalServer()

    return { sessions }
  }),
})
