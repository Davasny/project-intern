export const isInternRunDiffText = (text: string) =>
  text.includes("*** Begin Patch") ||
  text.includes("diff --git") ||
  text.includes("@@") ||
  text.split("\n").some((line) => line.startsWith("+") || line.startsWith("-"))
