import { NewsView } from "@/views/NewsView";
import { useNewsManagement } from "@/viewmodels/useNewsManagement";

export function NewsSection({ focus }: { focus?: { id: number; nonce: number } | null }) {
  const viewModel = useNewsManagement();

  return <NewsView {...viewModel} focus={focus} />;
}
