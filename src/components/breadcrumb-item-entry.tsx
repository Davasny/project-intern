import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export type BreadcrumbItemData = {
  label: string
  href: string
  isCurrentPage: boolean
  originalLabel?: string
}

type BreadcrumbItemEntryProps = {
  crumb: BreadcrumbItemData
  showSeparator: boolean
}

export const BreadcrumbItemEntry = ({
  crumb,
  showSeparator,
}: BreadcrumbItemEntryProps) => {
  const content = crumb.isCurrentPage ? (
    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
  ) : (
    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
  )

  return (
    <BreadcrumbItem>
      {showSeparator ? <BreadcrumbSeparator /> : null}
      {crumb.originalLabel ? (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>{crumb.originalLabel}</TooltipContent>
        </Tooltip>
      ) : (
        content
      )}
    </BreadcrumbItem>
  )
}
