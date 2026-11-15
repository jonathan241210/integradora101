import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const source = (path: string) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

/** Archivos de la sección de publicación de especies (solicitudes y publicadas). */
const presentation = [
  "views/SpeciesRequestsView.tsx",
  "views/SpeciesRequestDetailView.tsx",
  "views/PublishedSpeciesView.tsx",
  "views/PublishedSpeciesDetailView.tsx",
  "components/SpeciesFichaForm.tsx",
  "components/SpeciesPhoto.tsx",
  "components/SpeciesStatusBadge.tsx",
  "components/RejectSpeciesRequestDialog.tsx",
  "sections/SpeciesRequestsSection.tsx",
  "sections/PublishedSpeciesSection.tsx",
  "sections/TulanpediaSection.tsx",
  "components/TulanpediaTabs.tsx",
  "components/PendingRequestNotice.tsx",
];
const viewModels = [
  "viewmodels/species-publication-shared.ts",
  "viewmodels/species-requests.ts",
  "viewmodels/useSpeciesRequests.ts",
  "viewmodels/published-species.ts",
  "viewmodels/usePublishedSpecies.ts",
];
const hooks = ["viewmodels/useSpeciesRequests.ts", "viewmodels/usePublishedSpecies.ts"];

it("CA-60 species-publication-mvvm: views, components y sections sin fetch ni axios ni services; sin cálculo de publication_status ni has_pending_request; hooks solo llaman a adminApi", () => {
  for (const path of presentation) {
    const text = source(path);

    expect(text, path).not.toMatch(/\bfetch\s*\(/);
    expect(text, path).not.toMatch(/axios/i);
    expect(text, path).not.toMatch(/from\s+["']@\/services/);
    expect(text, path).not.toMatch(/from\s+["']@arca\/api-client/);
    expect(text, path).not.toMatch(/XMLHttpRequest/);
    // Los flags llegan de la API: no se asignan ni se derivan en la vista.
    expect(text, path).not.toMatch(/\b(?:publication_status|has_pending_request|is_published)\s*=(?![=>])/);
    // Ni a partir de las fechas de publicación.
    expect(text, path).not.toMatch(/(?:published_at|unpublished_at)\s*(?:===?|!==?)\s*null\s*\?/);
  }

  for (const path of hooks) {
    const text = source(path);

    expect(text, path).toContain("adminApi");
    expect(text, path).not.toMatch(/\bfetch\s*\(/);
    expect(text, path).not.toMatch(/axios/i);
    expect(text, path).not.toMatch(/createHttpClient|createAdminApi/);

    // Solo importa servicios de la app: el cliente y la vista previa en memoria.
    const services = [...text.matchAll(/from\s+["'](@\/services\/[^"']+)["']/g)].map((match) => match[1]);

    expect(services.sort(), path).toEqual(["@/services/arca-api", "@/services/image-preview"]);
  }

  // Los ViewModels puros reciben el cliente por contexto: no lo importan.
  for (const path of ["viewmodels/species-requests.ts", "viewmodels/published-species.ts"]) {
    expect(source(path), path).not.toMatch(/from\s+["']@\/services/);
  }

  // El estado de la especie lo calcula la API: ningún ViewModel lo deriva de otros campos.
  for (const path of viewModels) {
    expect(source(path), path).not.toMatch(/publication_status\s*=\s*[^=]/);
  }
});

it("CA-44 species-publication-mvvm: en los archivos de la sección no aparece image_url ni /media", () => {
  for (const path of [...presentation, ...viewModels, "viewmodels/tulanpedia-tab.ts", "viewmodels/useTulanpediaTab.ts"]) {
    const text = source(path);

    expect(text, path).not.toContain("image_url");
    expect(text, path).not.toContain("/media");
  }
});

it("CA-60 species-publication-mvvm: TulanpediaSection, TulanpediaTabs y PendingRequestNotice sin fetch, axios ni services; ningún cálculo de has_pending_request", () => {
  for (const path of [
    "sections/TulanpediaSection.tsx",
    "components/TulanpediaTabs.tsx",
    "components/PendingRequestNotice.tsx",
    "viewmodels/tulanpedia-tab.ts",
    "viewmodels/useTulanpediaTab.ts",
  ]) {
    const text = source(path);

    expect(text, path).not.toMatch(/\bfetch\s*\(/);
    expect(text, path).not.toMatch(/axios/i);
    expect(text, path).not.toMatch(/from\s+["']@\/services/);
    expect(text, path).not.toMatch(/from\s+["']@arca\/api-client/);
    expect(text, path).not.toMatch(/has_pending_request\s*=(?![=>])/);
  }
});

it("RN-10 species-publication-mvvm: sin localStorage ni sessionStorage en la sección", () => {
  for (const path of [...presentation, ...viewModels, "viewmodels/tulanpedia-tab.ts", "viewmodels/useTulanpediaTab.ts"]) {
    const text = source(path);

    expect(text, path).not.toMatch(/localStorage|sessionStorage|indexedDB|caches\./);
  }
});
