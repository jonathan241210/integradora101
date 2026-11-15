import { Alert, Button, Card, SelectField } from "@arca/ui";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { HasMorePaginationBar } from "@/components/HasMorePaginationBar";
import { ListStatusMessage } from "@/components/ListStatusMessage";
import { NoticeBar } from "@/components/NoticeBar";
import { SectionHeading } from "@/components/SectionHeading";
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
        <>
          <span>{requestTypeLabels[row.request_type]}</span>
          {row.publication_status === "unpublished" && (
            <span className="species-tag">{unpublishedSpeciesLabel}</span>
          )}
        </>
      ),
    },
    { key: "status", header: "Estado", render: (row) => <SpeciesStatusBadge status={row.status} /> },
    {
      key: "action",
      header: "Acción",
      render: (row) => (
        <Button variant="secondary" onClick={() => actions.open(row.id)}>
          {row.status === "rejected" ? "Ver" : "Revisar"}
        </Button>
      ),
    },
  ];

  return (
    <>
      <SectionHeading
        eyebrow="Publicación de especies"
        title="Solicitudes de especies"
        description="Revisa las solicitudes del veterinario para publicar o actualizar especies en TulanPedia."
      />
      <NoticeBar message={state.notice} onDismiss={actions.dismissNotice} />

      {list.forbidden ? (
        <Alert role="alert" aria-live="assertive">
          {list.error}
        </Alert>
      ) : (
        <>
          <Card className="filter-card">
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
          </Card>
          <Card className="table-card">
            <ListStatusMessage
              status={list.status}
              error={list.error}
              loadingText="Cargando solicitudes…"
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
                />
                <HasMorePaginationBar
                  page={state.page}
                  hasMore={list.hasMore}
                  onPageChange={actions.goToPage}
                />
              </>
            )}
            {list.status === "empty" && state.page > 1 && (
              <HasMorePaginationBar page={state.page} hasMore={false} onPageChange={actions.goToPage} />
            )}
          </Card>
        </>
      )}
    </>
  );
}
