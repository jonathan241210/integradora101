import { Button } from "@arca/ui";

export function PaginationBar({
  page,
  lastPage,
  total,
  busy = false,
  onPageChange,
}: {
  page: number;
  lastPage: number;
  total: number;
  busy?: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav className="pagination-bar" aria-label="Paginación">
      <span className="pagination-bar__summary" aria-live="polite">
        Página {page} de {Math.max(lastPage, 1)} · {total} en total
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
          disabled={busy || page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
