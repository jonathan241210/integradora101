import { EnclosuresView } from "@/views/EnclosuresView";
import { useEnclosuresManagement } from "@/viewmodels/useEnclosuresManagement";

export function EnclosuresSection() {
  const viewModel = useEnclosuresManagement();

  return <EnclosuresView {...viewModel} />;
}
