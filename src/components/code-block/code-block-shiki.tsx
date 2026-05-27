"use client"

import {
  type ComponentProps,
  type CSSProperties,
  useEffect,
  useState,
} from "react"
import { cn } from "@/lib/utils"
import { highlight, type Languages, Themes } from "@/utils/shiki/highlight"
import { showLineNumbers } from "@/utils/shiki/transformers/show-line-numbers"
import { wordWrapContent } from "@/utils/shiki/transformers/word-wrap"

interface CodeblockClientShikiProps extends ComponentProps<"div"> {
  code: string
  language?: Languages
  lineNumbers?: boolean
  fontSize?: "xs" | "sm" | "base" | "lg" | "xl"
}

const CodeblockShiki = ({
  code,
  language = "json",
  lineNumbers = false,
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
          showLineNumbers({ activateByDefault: true }),
          wordWrapContent(),
        ],
      })

      setHighlightedHtml(html)
    }
    void clientHighlight()
  }, [code, language])

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
