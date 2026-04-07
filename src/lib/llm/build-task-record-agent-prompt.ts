export const buildTaskRecordAgentPrompt = ({
  taskTitle,
  taskDescription,
  recordContext,
}: {
  taskTitle: string
  taskDescription: string
  recordContext: object
}) =>
  `
<taskTitle>
${taskTitle}
</taskTitle>

<taskDescription>
${taskDescription}
</taskDescription>
  
<crmRecordContext>
  ${JSON.stringify(recordContext, null, 2)}
</crmRecordContext>
`
