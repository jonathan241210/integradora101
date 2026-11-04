import { NewsView } from "@/views/NewsView";
import { useNewsManagement } from "@/viewmodels/useNewsManagement";

export function NewsSection() {
  const viewModel = useNewsManagement();

  return <NewsView {...viewModel} />;
}
