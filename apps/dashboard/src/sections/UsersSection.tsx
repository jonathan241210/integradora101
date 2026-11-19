import { UsersView } from "@/views/UsersView";
import { useStaffAccounts, type StaffFocus } from "@/viewmodels/useStaffAccounts";

export function UsersSection({ focus = null }: { focus?: StaffFocus }) {
  const viewModel = useStaffAccounts(focus);

  return <UsersView {...viewModel} />;
}
