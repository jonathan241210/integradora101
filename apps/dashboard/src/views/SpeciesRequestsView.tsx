import { Alert, Button, Card, Pagination, SelectField } from "@arca/ui";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { ListStatusMessage } from "@/components/ListStatusMessage";
import { TableSkeleton } from "@/components/LoadingSkeletons";
import { NoticeBar } from "@/components/NoticeBar";
import { SpeciesStatusBadge } from "@/components/SpeciesStatusBadge";
import type { SpeciesRequestSummaryDto } from "@/viewmodels/admin-types";
import { formatDateTime } from "@/viewmodels/formatters";
import {
  SCIENTIFIC_NAME_PREVIEW_MAX,
  categoryLabel,
  requestTypeLabels,
  truncateText,
  unpublishedSpeciesLabel,
} from "@/viewmodels/species-publication-shared";
import {
  requestFilterOptions,
  type RequestFilter,
  type SpeciesRequestsViewModel,
} from "@/viewmodels/species-requests";
import { SpeciesRequestDetailView } from "./SpeciesRequestDetailView";

/** Lista de solicitudes (CA-02 a CA-04, CA-15) o, con una abierta, su detalle. */
export function SpeciesRequestsView(viewModel: SpeciesRequestsViewModel) {
  const { state, actions } = viewModel;

  if (state.selectedId !== null) return <SpeciesRequestDetailView {...viewModel} />;

  const { list } = state;
  const columns: DataTableColumn<SpeciesRequestSummaryDto>[] = [
    {
      key: "species",
      header: "Especie",
      render: (row) => (
        <>
          <strong>{row.common_name ?? "—"}</strong>
          <span className="species-row__sub">
            {truncateText(row.scientific_name, SCIENTIFIC_NAME_PREVIEW_MAX)}
          </span>
        </>
      ),
    },
    { key: "category", header: "Tipo de animal", render: (row) => categoryLabel(row.category) },
    { key: "vet", header: "Veterinario", render: (row) => row.veterinarian_name ?? "—" },
    { key: "date", header: "Enviada", render: (row) => formatDateTime(row.created_at) },
    {
      key: "type",
      header: "Solicitud",
      render: (row) => (
        <span className="species-cell">
          <span>{requestTypeLabels[row.request_type]}</span>
          {row.publication_status === "unpublished" && (
            <span className="species-tag">{unpublishedSpeciesLabel}</span>
          )}
        </span>
      ),
    },
    { key: "status", header: "Estado", render: (row) => <SpeciesStatusBadge status={row.status} /> },
    {
      key: "action",
      header: "Acción",
      render: (row) => (
        <div className="row-actions">
          <Button
            variant="secondary"
            aria-label={`${row.status === "rejected" ? "Ver" : "Revisar"} solicitud de ${row.common_name ?? "especie"}`}
            onClick={() => actions.open(row.id)}
          >
            {row.status === "rejected" ? "Ver" : "Revisar"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <NoticeBar message={state.notice} onDismiss={actions.dismissNotice} />

      {list.forbidden ? (
        <Alert role="alert" aria-live="assertive">
          {list.error}
        </Alert>
      ) : (
        <>
          <Card className="filter-card">
            <form className="filter-form filter-form--species" onSubmit={(event) => event.preventDefault()}>
            <SelectField
              id="species-requests-filter"
              name="status"
              label="Estado"
              value={state.filter}
              onChange={(event) => actions.changeFilter(event.target.value as RequestFilter)}
            >
              {requestFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
            </form>
          </Card>
          <Card className="table-card">
            <ListStatusMessage
              status={list.status}
              error={list.error}
              loadingText="Cargando solicitudes…"
              skeleton={<TableSkeleton columns={columns} caption="Solicitudes de especies" label="Cargando solicitudes…" />}
              emptyText="No hay solicitudes con este estado."
              onRetry={actions.reload}
            />
            {list.status === "ready" && (
              <>
                <DataTable
                  caption="Solicitudes de especies"
                  columns={columns}
                  rows={list.items}
                  rowKey={(row) => row.id}
                  rowSearchId={(row) => `tulanpedia:species-request:${row.id}`}
                />
                <Pagination
                  page={state.page}
                  lastPage={list.lastPage}
                  total={list.total}
                  onPageChange={actions.goToPage}
                />
              </>
            )}
            {list.status === "empty" && state.page > 1 && (
              <Pagination
                page={state.page}
                lastPage={list.lastPage}
                total={list.total}
                onPageChange={actions.goToPage}
              />
            )}
          </Card>
        </>
      )}
    </>
  );
}
