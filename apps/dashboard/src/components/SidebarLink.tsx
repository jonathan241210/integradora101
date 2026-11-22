import { Icon, type IconName } from "@/components/Icon";
import type { DashboardSection } from "@/viewmodels/dashboard-shell";
import { sectionAccessibleName, sectionHasPending, type PendingCounts } from "@/viewmodels/pending-review";

type SidebarLinkProps = {
  id: DashboardSection;
  label: string;
  icon: IconName;
  active: boolean;
  counts: PendingCounts;
  onSelect: (section: DashboardSection) => void;
};

/** Opción del menú con puntito decorativo de pendientes (dashboard-018 CA-05, CA-09). */
export function SidebarLink({ id, label, icon, active, counts, onSelect }: SidebarLinkProps) {
  return (
    <button
      className={`sidebar-link ${active ? "sidebar-link--active" : ""}`}
      type="button"
      aria-label={sectionAccessibleName(label, id, counts)}
      title={label}
      aria-current={active ? "page" : undefined}
      onClick={() => onSelect(id)}
    >
      <Icon name={icon} />
      <span>{label}</span>
      {sectionHasPending(counts, id) && <span className="sidebar-link__dot" aria-hidden="true" />}
    </button>
  );
}
