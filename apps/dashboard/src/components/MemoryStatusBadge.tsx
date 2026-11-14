import { Badge } from "@arca/ui";
import type { MemoryReviewStatus } from "@/viewmodels/admin-types";
import { memoryStatusLabels } from "@/viewmodels/memory-review-shared";
import { Icon, type IconName } from "./Icon";

const badges: Record<
  MemoryReviewStatus,
  { tone: "success" | "warning" | "danger" | "neutral"; icon: IconName }
> = {
  submitted: { tone: "warning", icon: "dots" },
  in_review: { tone: "neutral", icon: "search" },
  accepted: { tone: "success", icon: "check" },
  rejected: { tone: "danger", icon: "close" },
};

/** Estado con icono y texto, no solo color (CA-15). */
export function MemoryStatusBadge({ status }: { status: MemoryReviewStatus }) {
  const badge = badges[status];

  return (
    <Badge tone={badge.tone}>
      <span className="memory-review__badge">
        <Icon name={badge.icon} width={14} height={14} />
        {memoryStatusLabels[status]}
      </span>
    </Badge>
  );
}
