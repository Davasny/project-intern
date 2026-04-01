import { TaskDetailsPage } from "@/features/tasks/components/task-details-page"

const TaskRoutePage = async ({
  params,
}: {
  params: Promise<{
    organizationSlug: string
    projectSlug: string
    taskId: string
  }>
}) => {
  const { organizationSlug, projectSlug, taskId } = await params

  return (
    <TaskDetailsPage
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
      taskId={taskId}
    />
  )
}

export default TaskRoutePage
