"use client"

import {
  type ComponentProps,
  type CSSProperties,
  useEffect,
  useState,
} from "react"
import { cn } from "@/lib/utils"
import { highlight, type Languages, Themes } from "@/utils/shiki/highlight"
import { addLineClassNames } from "@/utils/shiki/transformers/add-line-class-names"
import { showLineNumbers } from "@/utils/shiki/transformers/show-line-numbers"
import { wordWrapContent } from "@/utils/shiki/transformers/word-wrap"

interface CodeblockClientShikiProps extends ComponentProps<"div"> {
  code: string
  language?: Languages
  lineNumbers?: boolean
  lineClassNames?: ReadonlyArray<string | null>
  fontSize?: "xs" | "sm" | "base" | "lg" | "xl"
}

const emptyLineClassNames: ReadonlyArray<string | null> = []

const CodeblockShiki = ({
  code,
  language = "json",
  lineNumbers = true,
  lineClassNames = emptyLineClassNames,
  fontSize = "sm",
  className,
  ...props
}: CodeblockClientShikiProps) => {
  const fontSizeMap = {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
  } as const
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)
  const lineClassSignature = lineClassNames.join("\n")

  useEffect(() => {
    async function clientHighlight() {
      if (!code) {
        setHighlightedHtml("<pre><code></code></pre>")
        return
      }
      const highlighter = await highlight()
      const html = highlighter.codeToHtml(code, {
        lang: language,
        themes: {
          light: Themes.light,
          dark: Themes.dark,
        },
        transformers: [
          showLineNumbers({ activateByDefault: lineNumbers }),
          wordWrapContent(),
          addLineClassNames(lineClassNames),
        ],
      })

      setHighlightedHtml(html)
    }
    void clientHighlight()
  }, [code, language, lineClassSignature, lineNumbers])

  const classNames = cn("w-full overflow-x-auto", className)

  // SSR fallback
  return highlightedHtml ? (
    <div
      className={classNames}
      style={{ "--shiki-font-size": fontSizeMap[fontSize] } as CSSProperties}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: we need to render custom code
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      {...props}
    />
  ) : (
    <div
      className={classNames}
      style={{ "--shiki-font-size": fontSizeMap[fontSize] } as CSSProperties}
      {...props}
    >
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  )
}

export { CodeblockShiki }
