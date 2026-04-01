const ProjectOverviewPage = async ({
  params,
}: {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}) => {
  const { organizationSlug, projectSlug } = await params

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Project overview
          </h1>
          <p className="text-sm text-slate-600">
            Phase 1 provides authenticated organization and project scope for{" "}
            <strong>{organizationSlug}</strong>/<strong>{projectSlug}</strong>.
          </p>
        </div>
      </section>
    </div>
  )
}

export default ProjectOverviewPage
