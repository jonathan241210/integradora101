import type { CancellationReviewDto } from "@/viewmodels/admin-types";
import { formatTicketDateTime } from "@/viewmodels/ticket-history";

/** Revisión vigente tal como llega, o «Sin revisar» (CA-04). */
export function CancellationCurrentReview({
  review,
  timezone,
}: {
  review: CancellationReviewDto | null;
  timezone: string;
}) {
  if (!review) return <span>Sin revisar</span>;

  return (
    <div className="cancellation-review-current">
      <strong>{review.status_label}</strong>
      <p>{review.note}</p>
      <small>
        {review.reviewed_by_name ?? "—"} · {formatTicketDateTime(review.reviewed_at, timezone)}
      </small>
    </div>
  );
}
