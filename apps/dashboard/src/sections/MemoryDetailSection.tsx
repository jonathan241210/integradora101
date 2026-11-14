import { MemoryReviewDetailView } from "@/views/MemoryReviewDetailView";
import { useMemoryReviewDetail } from "@/viewmodels/useMemoryReviewDetail";

/** Contenedor del detalle: el hook se llama solo cuando hay una petición abierta. */
export function MemoryDetailSection({ id, onBack }: { id: number; onBack: () => void }) {
  const viewModel = useMemoryReviewDetail(id);

  return <MemoryReviewDetailView {...viewModel} onBack={onBack} />;
}
