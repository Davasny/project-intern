import type { ShikiTransformer } from "shiki"

const appendClassName = ({
  className,
  existingClassName,
}: {
  className: string
  existingClassName: unknown
}) => {
  if (Array.isArray(existingClassName)) {
    return [...existingClassName, className]
  }

  if (typeof existingClassName === "string") {
    return `${existingClassName} ${className}`
  }

  return className
}

export const addLineClassNames = (
  lineClassNames: ReadonlyArray<string | null>,
): ShikiTransformer => ({
  name: "AddLineClassNames",
  line(node, line) {
    const className = lineClassNames[line - 1]

    if (!className) {
      return
    }

    node.properties.class = appendClassName({
      className,
      existingClassName: node.properties.class,
    })
  },
})
