# 01. Auth, Organizations, and Projects

## Objective
Deliver the v1 tenancy and entry flow: Better Auth, organization bootstrap, project ownership, project selection, and the shared repository/config skeleton that all later phases depend on.

## Problem this phase solves
- The product needs a concrete authenticated boundary before any record, task, or execution data can exist.
- Users must always operate inside an organization and selected project scope.
- Later phases need stable auth ownership, DB/runtime config rules, and protected route scope.

## Scope
### In scope
- Better Auth server/client setup inside `src/features/auth`
- GitHub OAuth as the normal v1 auth method
- Better Auth anonymous plugin enabled only in development
- Auth tables and organization membership model
- First-login organization bootstrap
- Project creation / selection flow
- Protected route shell with `organizationSlug` and `projectSlug`
- Local PostgreSQL 18 Docker Compose runtime on port `5433`
- Config split into `frontend.ts`, `backend.ts`, `database.ts`, with DB client in `src/lib/db.ts`

### Out of scope
- Records, tasks, agent runs, files, artifacts, pipelines
- MCP, OpenCode execution, queues, schedules
- Schema migration UX
- Email invitations, public join links, project-specific membership

## Source sections from CRM plan
- Section 1: Objective and v1 stack
- Section 4.1: User, Organization, ProjectMembership / OrganizationMembership, Project
- Section 4.2: single Next.js app + mounted Hono API blueprint
- Section 4.3: repository blueprint, auth ownership, config ownership
- Section 5.5: auth and tenancy model
- Section 5.6: auth / tenancy tables
- Section 5.8: membership simplification decision
- Section 5.9: local database runtime blueprint
- Section 8A.1 and 8A.9: scope model and early routes
- Section 22: v1 boundaries
- Section 23 Phase 1 and Section 25.6 step 1

## Dependencies / prerequisites
- None; this is the foundation phase.
- The repo must accept the `src/features/*`, `src/lib/*`, and `src/app/*` structure from the master plan.
- All later feature code must import the DB client from `src/lib/db.ts`, never raw DB env config.

## Required stack and libraries
- **TypeScript** — all app, schema, service, and contract code
- **Next.js App Router** — public/protected route shells and scope-aware app routing
- **Hono** — single backend entrypoint mounted in Next.js API
- **tRPC + TanStack React Query** — app data access pattern for protected product surfaces
- **Drizzle + PostgreSQL 18** — canonical DB schema and storage
- **Docker Compose** — local Postgres runtime
- **Better Auth** — user auth, sessions, organizations, GitHub OAuth, development-only anonymous login
- **Zod** — input validation and auth-facing schemas
- **shadcn/ui + Tailwind CSS** — minimal auth/onboarding UI and protected shell framing

## Domain objects and data model
Describe only the tenancy and scope entities used in this phase.

### Entities
- `User`
- `Session`
- `Account`
- `Verification`
- `Organization`
- `OrganizationMembership`
- `Project`

### Required fields
```ts
type Project = {
  id: string
  organizationId: string
  slug: string
  displayName: string
  activeSchemaVersionId?: string
}
```

### Tables / storage
- `user` — Better Auth user identity
- `session` — Better Auth session storage
- `account` — OAuth account linkage
- `verification` — Better Auth verification support
- `organization` — org ownership boundary; `slug` unique
- `organizationMembership` — explicit membership with role `owner | member`
- `project` — org-owned project boundary; unique `(organizationId, slug)`

Tenancy rules:
- user always enters through an organization
- all important reads/writes must be filtered by organization + project access
- in v1, all organization members can access all projects in that organization

## Backend architecture for this phase
### Feature folders
```txt
src/
  app/
    (public)/
    (protected)/app/[organizationSlug]/[projectSlug]/
    api/[[...route]]/route.ts
  features/
    auth/
      db.ts
      router.ts
      consts/
      lib/
        auth.ts
        auth-client.ts
        global-roles.ts
        organization-roles.ts
      utils/
    organizations/
    projects/
  lib/
    config/
      frontend.ts
      backend.ts
      database.ts
    db.ts
    trpc/
```

### Services to implement
- `api-app-service` — build the single mounted Hono app and shared middleware
- `auth-service` — Better Auth integration and post-login organization bootstrap
- `project-access-service` — resolve current org/project scope and membership checks

### Validation and auth rules
- `src/features/auth/lib/auth.ts` owns the Better Auth server instance
- `src/features/auth/lib/auth-client.ts` owns the Better Auth client instance
- anonymous login must be enabled only when app config marks environment as development
- no project-specific membership table in v1
- organization owner can add existing users directly; no email invite flow

### API / router surface
- Hono route group `/auth/*` for Better Auth handlers
- Hono route group `/trpc/*` for app procedures
- auth and scope resolution shared across the mounted Hono app

## Frontend architecture for this phase
### Routes
- landing / sign-in
- organization bootstrap or selection
- project creation or selection
- `/app/[organizationSlug]/[projectSlug]` — initial protected project shell target

### Screens / surfaces
- landing/sign-in screen
- organization bootstrap/select screen
- project create/select screen
- protected app shell with organization switcher, project switcher, and project navigation frame

### Shared UI components
- basic app shell framing starts here
- avoid broad design-system work; only minimal shell needed for scoped navigation

### Forms
- auth entry surfaces
- organization create/select surface
- project create/select surface

## Execution flow
### Main flow
1. User signs in with GitHub.
2. System creates user if missing.
3. System creates a default organization if the user has none.
4. System assigns the user as organization owner.
5. User lands in project creation / selection flow.
6. Protected routing resolves `organizationSlug` and `projectSlug` scope.

### Edge cases / failure paths
- Anonymous login is available only in development.
- Production UI must not expose anonymous login.
- Unauthorized org/project access must fail before business logic.

## State and lifecycle rules
- No execution machines yet.
- Auth/session lifecycle is owned by Better Auth.
- Organization membership is explicit and minimal: `owner`, `member`.

## Security and guardrails
- Better Auth session auth protects UI and normal app API access.
- Every protected request resolves user, organization membership, and project scope before business logic.
- Do not place auth ownership in `src/lib/auth`.
- Do not import raw database config outside `src/lib/db.ts`.

## Observability and audit
- Foundation should support later activity logging by carrying org/project scope in request context.
- No phase-specific activity events required yet beyond normal auth/session behavior.

## Implementation sequence inside this phase
1. Add local Postgres 18 Docker Compose runtime on port `5433` with DB `project_intern` and credentials `intern` / `intern`.
2. Add config split and DB client ownership rules.
3. Implement Better Auth inside `src/features/auth`.
4. Add organization bootstrap and membership rules.
5. Add project table, services, and protected scope resolution.
6. Build landing/sign-in, organization bootstrap/select, and project create/select screens.
7. Mount the single Hono app in the Next.js API catch-all route.

## Acceptance criteria
- [ ] GitHub OAuth works through Better Auth.
- [ ] Anonymous login is enabled only in development.
- [ ] First login creates a personal organization and owner membership.
- [ ] Projects are org-owned and addressed by `organizationSlug` + `projectSlug`.
- [ ] Protected routes resolve scope before feature logic.
- [ ] DB config is imported only through `src/lib/db.ts`.

## Handoff to next phase
- Expose stable `Organization`, `OrganizationMembership`, and `Project` ownership boundaries.
- Expose protected route scope and DB/config contracts.
- Keep auth ownership in `src/features/auth` unchanged.

## Do not implement yet
- Record schema editing and record CRUD
- Tasks, task fan-out, task-record processing
- Agent execution, MCP, OpenCode, queues, files, artifacts
