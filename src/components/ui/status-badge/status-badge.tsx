import { Badge } from "@/components/ui/badge"

type StatusBadgeProps = {
  label: string
  tone: StatusBadgeTone
}

export type StatusBadgeTone =
  | "danger"
  | "info"
  | "muted"
  | "skill"
  | "success"
  | "warning"

const toneClasses = {
  danger: "border-tone-danger bg-tone-danger-bg text-tone-danger-foreground",
  info: "border-tone-info bg-tone-info-bg text-tone-info-foreground",
  muted: "border-tone-muted bg-tone-muted-bg text-tone-muted-foreground",
  skill: "border-tone-skill bg-tone-skill-bg text-tone-skill-foreground",
  success:
    "border-tone-success bg-tone-success-bg text-tone-success-foreground",
  warning:
    "border-tone-warning bg-tone-warning-bg text-tone-warning-foreground",
}

export const StatusBadge = ({ label, tone }: StatusBadgeProps) => (
  <Badge className={toneClasses[tone]}>{label}</Badge>
)
