import { Badge } from "@/components/ui/badge"

type StatusBadgeProps = {
  label: string
  tone: "danger" | "info" | "muted" | "success" | "warning"
}

const toneClasses = {
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  muted: "border-slate-200 bg-slate-100 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
}

export const StatusBadge = ({ label, tone }: StatusBadgeProps) => (
  <Badge className={toneClasses[tone]}>{label}</Badge>
)
