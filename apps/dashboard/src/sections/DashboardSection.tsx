import { DashboardView } from "@/views/DashboardView";
import { useDashboardSummary } from "@/viewmodels/useDashboardSummary";

export function DashboardSection({ onOpenReport }: { onOpenReport?: () => void }) {
  const viewModel = useDashboardSummary();

  return <DashboardView {...viewModel} onOpenReport={onOpenReport} />;
}
