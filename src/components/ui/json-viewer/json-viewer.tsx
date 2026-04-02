import {
  CodeBlock,
  CodeBlockGroup,
  CodeBlockHeader,
  CodeBlockIcon,
} from "@/components/code-block/code-block"
import { CodeblockShiki } from "@/components/code-block/code-block-shiki"

type JsonViewerProps = {
  value: Record<string, unknown>
}

export const JsonViewer = ({ value }: JsonViewerProps) => (
  <CodeBlock>
    <CodeBlockHeader>
      <CodeBlockGroup>
        <CodeBlockIcon language="json" />
      </CodeBlockGroup>
    </CodeBlockHeader>

    <CodeblockShiki
      language="json"
      code={JSON.stringify(value, null, 2)}
      lineNumbers
    />
  </CodeBlock>
)
