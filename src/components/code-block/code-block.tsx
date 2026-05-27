import { FileIcon } from "@react-symbols/icons/utils"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

const CodeBlock = ({
  children,
  className,
  ...props
}: ComponentProps<"div">) => {
  return (
    <div
      className={cn(
        "not-prose",
        "flex w-full flex-col overflow-clip rounded-lg shadow-xs",
        "bg-muted/40 dark:bg-muted/70",
        "border border-border",
        "text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

type CodeBlockHeaderProps = ComponentProps<"div">

const CodeBlockHeader = ({
  children,
  className,
  ...props
}: CodeBlockHeaderProps) => {
  return (
    <div
      className={cn(
        "not-prose", // Disable Markdown Styles
        "flex h-9 items-center justify-between px-2 py-1.5",
        "text-sm text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface CodeBlockIconProps extends ComponentProps<"div"> {
  language?: string
}

const CodeBlockIcon = ({ language, className }: CodeBlockIconProps) => {
  return (
    <FileIcon
      width={16}
      height={16}
      fileName={`.${language ?? ""}`}
      autoAssign={true}
      className={cn(className)}
    />
  )
}

type CodeBlockGroupProps = ComponentProps<"div">

const CodeBlockGroup = ({
  children,
  className,
  ...props
}: CodeBlockGroupProps) => {
  return (
    <div
      className={cn(
        "flex items-center space-x-2",
        "text-sm text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const CodeBlockContent = ({
  className,
  children,
  ...props
}: ComponentProps<"div">) => {
  return (
    <div
      className={cn(
        "max-h-96 overflow-y-auto",
        "bg-background",
        "rounded-lg font-mono text-sm leading-5 whitespace-pre",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export {
  CodeBlock,
  
  CodeBlockGroup,
  CodeBlockHeader,
  CodeBlockIcon,
}
