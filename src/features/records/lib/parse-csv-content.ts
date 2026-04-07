type ParsedCsvContent = {
  headers: string[]
  rows: string[][]
}

const trimByteOrderMark = (value: string) =>
  value.charCodeAt(0) === 0xfeff ? value.slice(1) : value

const parseCsvCells = (csvContent: string) => {
  const rows: string[][] = []
  let currentCell = ""
  let currentRow: string[] = []
  let isInsideQuotes = false

  const pushCell = () => {
    currentRow.push(currentCell)
    currentCell = ""
  }

  const pushRow = () => {
    const rowHasAnyValue = currentRow.some((cell) => cell.trim().length > 0)

    if (rowHasAnyValue) {
      rows.push(currentRow)
    }

    currentRow = []
  }

  for (let index = 0; index < csvContent.length; index += 1) {
    const character = csvContent[index]
    const nextCharacter = csvContent[index + 1]

    if (character === '"') {
      if (isInsideQuotes && nextCharacter === '"') {
        currentCell += '"'
        index += 1
        continue
      }

      isInsideQuotes = !isInsideQuotes
      continue
    }

    if (!isInsideQuotes && character === ",") {
      pushCell()
      continue
    }

    if (!isInsideQuotes && (character === "\n" || character === "\r")) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1
      }

      pushCell()
      pushRow()
      continue
    }

    currentCell += character
  }

  const hasPendingContent = currentCell.length > 0 || currentRow.length > 0

  if (hasPendingContent) {
    pushCell()
    pushRow()
  }

  if (isInsideQuotes) {
    throw new Error("CSV contains an unclosed quoted value.")
  }

  return rows
}

export const parseCsvContent = (csvContent: string): ParsedCsvContent => {
  const parsedRows = parseCsvCells(csvContent)
  const [rawHeaderRow, ...rawDataRows] = parsedRows

  if (!rawHeaderRow || rawHeaderRow.length === 0) {
    throw new Error("CSV must include a header row.")
  }

  const headers = rawHeaderRow.map((header, index) => {
    const normalizedHeader = index === 0 ? trimByteOrderMark(header) : header
    return normalizedHeader.trim()
  })

  return {
    headers,
    rows: rawDataRows,
  }
}
