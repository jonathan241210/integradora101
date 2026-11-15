import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PendingRequestNotice } from "../components/PendingRequestNotice";
import { PublishedSpeciesView } from "../views/PublishedSpeciesView";
import { PublishedSpeciesDetailView } from "../views/PublishedSpeciesDetailView";
import { loadRequestList, initialSpeciesRequestsState } from "../viewmodels/species-requests";
import { fakeApi, harness } from "./species-fixtures";
import {
  publication,
  publishedStateWith,
  publishedViewModel,
  row,
  unpublishedSpecies,
} from "./species-published-fixtures";

const notice = "Esta especie tiene una solicitud pendiente. Revísala en la pestaña Solicitudes.";

const list = (has: boolean) =>
  renderToStaticMarkup(
    <PublishedSpeciesView
      {...publishedViewModel(
        publishedStateWith({
          list: {
            status: "ready",
            items: [row({ has_pending_request: has })],
            hasMore: false,
            error: "",
            forbidden: false,
          },
          thumbs: { 3: { status: "none", url: "" } },
        }),
      )}
      onOpenRequests={() => undefined}
    />,
  );

it("CA-64 published-species-pending-notice: aviso y enlace con has_pending_request true; sin aviso con false", () => {
  const withRequest = list(true);

  expect(withRequest).toContain(notice);
  expect(withRequest).toContain(">Ver la solicitud<");
  expect(list(false)).not.toContain(notice);
  expect(list(false)).not.toContain("Ver la solicitud");

  const detail = (data: ReturnType<typeof publication>) =>
    renderToStaticMarkup(
      <PublishedSpeciesDetailView
        {...publishedViewModel(publishedStateWith({ selectedId: data.id, detail: { status: "ready", data, error: "", forbidden: false } } as never))}
        onOpenRequests={() => undefined}
      />,
    );

  expect(detail(unpublishedSpecies({ publication_status: "pending", has_pending_request: true }))).toContain(notice);
  expect(detail(unpublishedSpecies())).not.toContain(notice);
  expect(renderToStaticMarkup(<PendingRequestNotice message={notice} />)).not.toContain("Ver la solicitud");
});

it("CA-64 published-species-pending-notice: el enlace activa Solicitudes con filtro Pendiente y pide la API", async () => {
  // «Solicitudes» se monta de nuevo con el filtro «Pendiente» (submitted) y pide la API.
  expect(initialSpeciesRequestsState.filter).toBe("submitted");

  const { api, requests } = fakeApi();
  const h = harness(api);

  await loadRequestList(h.ctx, { filter: initialSpeciesRequestsState.filter, page: 1 });
  expect(requests.list).toHaveBeenCalledWith({ status: "submitted", page: 1 });
});

it("CA-57 published-species-pending-notice: Editar y Republicar deshabilitados con el aviso de CA-64", () => {
  const html = list(true);

  expect(html).toMatch(/disabled=""[^>]*>Editar</);
  expect(html).toMatch(/disabled=""[^>]*>Republicar</);
  expect(html).toContain(notice);
});
