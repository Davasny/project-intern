export const formatProjectSchemaDefaultValue = (value: unknown) => {
  if (value === null) {
    return ""
  }

  return JSON.stringify(value)
}
