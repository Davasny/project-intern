export const calculateAverageCostUsd = ({
  denominator,
  totalCostUsd,
}: {
  denominator: number
  totalCostUsd: number
}) => (denominator > 0 ? totalCostUsd / denominator : 0)
