import { UsersView } from "@/views/UsersView";
import { useStaffAccounts } from "@/viewmodels/useStaffAccounts";

export function UsersSection() {
  const viewModel = useStaffAccounts();

  return <UsersView {...viewModel} />;
}
