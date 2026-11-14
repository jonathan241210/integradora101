import { Alert, Button, Card, SelectField } from "@arca/ui";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { HasMorePaginationBar } from "@/components/HasMorePaginationBar";
import { ListStatusMessage } from "@/components/ListStatusMessage";
import { MemoryStatusBadge } from "@/components/MemoryStatusBadge";
import { SectionHeading } from "@/components/SectionHeading";
import type { MemoryReviewSummaryDto } from "@/viewmodels/admin-types";
import { formatDateTime } from "@/viewmodels/formatters";
import {
  memoryFilterOptions,
  type MemoryFilter,
  type MemoryListViewModel,
} from "@/viewmodels/memory-review";
import { excerpt, resubmittedText } from "@/viewmodels/memory-review-shared";

/** Lista de peticiones de visitantes (CA-02 a CA-04, CA-13). */
export function MemoriesView({
  state,
  actions,
  onOpen,
}: MemoryListViewModel & { onOpen: (id: number) => void }) {
  const columns: DataTableColumn<MemoryReviewSummaryDto>[] = [
    { key: "date", header: "Enviada", render: (row) => formatDateTime(row.created_at) },
    { key: "status", header: "Estado", render: (row) => <MemoryStatusBadge status={row.status} /> },
    {
      key: "opinion",
      header: "Opinión",
      render: (row) => (
        <>
          <span className="memory-review__excerpt">{excerpt(row.opinion)}</span>
          {resubmittedText(row.resubmitted_count) && (
            <span className="memory-review__resubmitted">{resubmittedText(row.resubmitted_count)}</span>
          )}
        </>
      ),
    },
    {
      key: "action",
      header: "Acción",
      render: (row) => (
        <Button
          variant="secondary"
          aria-label={`Revisar petición enviada el ${formatDateTime(row.created_at)}`}
          onClick={() => onOpen(row.id)}
        >
          Revisar
        </Button>
      ),
    },
  ];

  return (
    <>
      <SectionHeading
        eyebrow="Momentos para recordar"
        title="Momentos"
        description="Revisa las fotos y opiniones que envían los visitantes antes de publicarlas en el portal."
      />

      {state.forbidden ? (
        <Alert role="alert" aria-live="assertive">
          {state.error}
        </Alert>
      ) : (
        <>
          <Card className="filter-card">
            <SelectField
              id="memory-review-filter"
              name="status"
              label="Estado"
              value={state.filter}
              onChange={(event) => actions.changeFilter(event.target.value as MemoryFilter)}
            >
              {memoryFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </Card>
          <Card className="table-card">
            <ListStatusMessage
              status={state.status}
              error={state.error}
              loadingText="Cargando peticiones…"
              emptyText="No hay peticiones con este estado."
              onRetry={actions.reload}
            />
            {state.status === "ready" && (
              <>
                <DataTable
                  caption="Peticiones de visitantes"
                  columns={columns}
                  rows={state.items}
                  rowKey={(row) => row.id}
                />
                <HasMorePaginationBar
                  page={state.page}
                  hasMore={state.hasMore}
                  onPageChange={actions.goToPage}
                />
              </>
            )}
            {state.status === "empty" && state.page > 1 && (
              <HasMorePaginationBar page={state.page} hasMore={false} onPageChange={actions.goToPage} />
            )}
          </Card>
        </>
      )}
    </>
  );
}
