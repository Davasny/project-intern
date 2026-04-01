import { TasksPage } from "@/features/tasks/components/tasks-page"

const TasksRoutePage = async ({
  params,
}: {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}) => {
  const { organizationSlug, projectSlug } = await params

  return (
    <TasksPage organizationSlug={organizationSlug} projectSlug={projectSlug} />
  )
}

export default TasksRoutePage
