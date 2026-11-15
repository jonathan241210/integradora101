import { Button } from "@arca/ui";

/** Paginación sin total (`meta.has_more`, api-014): «Anterior» y «Siguiente». */
export function HasMorePaginationBar({
  page,
  hasMore,
  busy = false,
  onPageChange,
}: {
  page: number;
  hasMore: boolean;
  busy?: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav className="pagination-bar" aria-label="Paginación">
      <span className="pagination-bar__summary" aria-live="polite">
        Página {page}
      </span>
      <div className="pagination-bar__actions">
        <Button
          variant="secondary"
          disabled={busy || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          disabled={busy || !hasMore}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
