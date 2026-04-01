import { ProjectSelectionFlow } from "@/features/projects/components/project-selection-flow"

const SelectProjectPage = () => (
  <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 p-6">
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-semibold tracking-tight">
        Select your scope
      </h1>
      <p className="text-sm text-slate-600">
        Every session runs inside one organization and one project.
      </p>
    </div>
    <ProjectSelectionFlow />
  </main>
)

export default SelectProjectPage
