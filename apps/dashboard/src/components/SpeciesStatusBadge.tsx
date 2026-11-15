import { Badge } from "@arca/ui";
import { Icon, type IconName } from "./Icon";

export type SpeciesBadgeStatus =
  | "submitted"
  | "accepted"
  | "rejected"
  | "published"
  | "unpublished";

const badges: Record<
  SpeciesBadgeStatus,
  { label: string; tone: "success" | "warning" | "danger" | "neutral"; icon: IconName }
> = {
  submitted: { label: "Pendiente", tone: "warning", icon: "dots" },
  accepted: { label: "Publicada", tone: "success", icon: "check" },
  rejected: { label: "Rechazada", tone: "danger", icon: "close" },
  published: { label: "Publicada", tone: "success", icon: "check" },
  unpublished: { label: "Despublicada", tone: "neutral", icon: "minus" },
};

/** Estado con icono y texto, no solo color (CA-03). */
export function SpeciesStatusBadge({ status }: { status: SpeciesBadgeStatus }) {
  const badge = badges[status];

  return (
    <Badge tone={badge.tone}>
      <span className="species-badge">
        <Icon name={badge.icon} width={14} height={14} />
        {badge.label}
      </span>
    </Badge>
  );
}
