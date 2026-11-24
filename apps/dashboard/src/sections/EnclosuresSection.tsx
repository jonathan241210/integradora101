import { EnclosuresView } from "@/views/EnclosuresView";
import { useEnclosuresManagement, type EnclosuresFocus } from "@/viewmodels/useEnclosuresManagement";

export function EnclosuresSection({
  canManage = true,
  focus = null,
}: {
  canManage?: boolean;
  focus?: EnclosuresFocus;
}) {
  const viewModel = useEnclosuresManagement(canManage, focus);

  return <EnclosuresView {...viewModel} />;
}
