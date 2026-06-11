type InlineLineDiffRow = {
  line: string
  type: "added" | "removed" | "unchanged"
}

const splitLines = (value: string) => value.split("\n")

const buildLcsMatrix = ({
  after,
  before,
}: {
  after: string[]
  before: string[]
}) => {
  const matrix = Array.from({ length: before.length + 1 }, () =>
    Array.from({ length: after.length + 1 }, () => 0),
  )

  for (
    let beforeIndex = before.length - 1;
    beforeIndex >= 0;
    beforeIndex -= 1
  ) {
    for (let afterIndex = after.length - 1; afterIndex >= 0; afterIndex -= 1) {
      matrix[beforeIndex][afterIndex] =
        before[beforeIndex] === after[afterIndex]
          ? matrix[beforeIndex + 1][afterIndex + 1] + 1
          : Math.max(
              matrix[beforeIndex + 1][afterIndex],
              matrix[beforeIndex][afterIndex + 1],
            )
    }
  }

  return matrix
}

export const buildInlineLineDiff = ({
  after,
  before,
}: {
  after: string
  before: string
}) => {
  const beforeLines = splitLines(before)
  const afterLines = splitLines(after)
  const matrix = buildLcsMatrix({ after: afterLines, before: beforeLines })
  const rows: InlineLineDiffRow[] = []
  let beforeIndex = 0
  let afterIndex = 0

  while (beforeIndex < beforeLines.length && afterIndex < afterLines.length) {
    if (beforeLines[beforeIndex] === afterLines[afterIndex]) {
      rows.push({ line: beforeLines[beforeIndex], type: "unchanged" })
      beforeIndex += 1
      afterIndex += 1
    } else if (
      matrix[beforeIndex + 1][afterIndex] >= matrix[beforeIndex][afterIndex + 1]
    ) {
      rows.push({ line: beforeLines[beforeIndex], type: "removed" })
      beforeIndex += 1
    } else {
      rows.push({ line: afterLines[afterIndex], type: "added" })
      afterIndex += 1
    }
  }

  while (beforeIndex < beforeLines.length) {
    rows.push({ line: beforeLines[beforeIndex], type: "removed" })
    beforeIndex += 1
  }

  while (afterIndex < afterLines.length) {
    rows.push({ line: afterLines[afterIndex], type: "added" })
    afterIndex += 1
  }

  return rows
}
