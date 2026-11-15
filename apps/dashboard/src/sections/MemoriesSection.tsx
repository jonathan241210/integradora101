import { useState } from "react";
import { MemoriesView } from "@/views/MemoriesView";
import { useMemoryReviewList } from "@/viewmodels/useMemoryReviewList";
import { MemoryDetailSection } from "./MemoryDetailSection";

/**
 * Sección «Momentos»: lista o detalle (sin React Router, ADR 0002). Al volver
 * del detalle se vuelve a pedir la lista para mostrar el estado nuevo (CA-05).
 */
export function MemoriesSection() {
  const viewModel = useMemoryReviewList();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (selectedId !== null) {
    return (
      <MemoryDetailSection
        key={selectedId}
        id={selectedId}
        onBack={() => {
          setSelectedId(null);
          viewModel.actions.reload();
        }}
      />
    );
  }

  return <MemoriesView {...viewModel} onOpen={setSelectedId} />;
}
