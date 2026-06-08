export const calculateAverageCostUsd = ({
  runCount,
  totalCostUsd,
}: {
  runCount: number
  totalCostUsd: number
}) => (runCount > 0 ? totalCostUsd / runCount : null)
