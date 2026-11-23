import type { TotalPage } from "./admin-types";
import { normalizeTotalPage } from "./admin";
import type { HttpClient } from "./http";
import type {
  OwnSpeciesRequestDto,
  SelectableSpeciesDto,
  SubmitSpeciesRequestInput,
  SubmittedSpeciesRequestDto,
} from "./veterinarian-types";

const base = "/api/v1/veterinarian";

type Enveloped<T> = T | { data: T };

function unwrap<T>(response: Enveloped<T>): T {
  if (
    typeof response === "object" &&
    response !== null &&
    !Array.isArray(response) &&
    "data" in response
  ) {
    return (response as { data: T }).data;
  }

  return response as T;
}

/**
 * Cuerpo multipart del envío (pwa-005 CA-05, CA-10). No incluye nombre común,
 * alta de especie ni tipo de envío: lo decide la API.
 */
export function buildSpeciesRequestFormData(
  input: SubmitSpeciesRequestInput,
): FormData {
  const form = new FormData();

  form.append("species_id", String(input.species_id));
  form.append("category", input.category);
  if (input.scientific_name !== undefined) {
    form.append("scientific_name", input.scientific_name);
  }
  if (input.habitat !== undefined) form.append("habitat", input.habitat);
  if (input.origin !== undefined) form.append("origin", input.origin);
  if (input.fun_fact !== undefined) form.append("fun_fact", input.fun_fact);
  form.append("published_fields", JSON.stringify(input.published_fields));
  if (input.image) form.append("image", input.image);

  return form;
}

export function createVeterinarianApi(http: HttpClient) {
  return {
    species: {
      async list(): Promise<SelectableSpeciesDto[]> {
        const response = await http.get<Enveloped<SelectableSpeciesDto[]>>(
          `${base}/species`,
        );
        const list = unwrap(response);

        return Array.isArray(list) ? list : [];
      },
    },
    publicationRequests: {
      async list(page = 1): Promise<TotalPage<OwnSpeciesRequestDto>> {
        const query = page > 1 ? `?page=${page}` : "";
        const response = await http.get<
          Partial<TotalPage<OwnSpeciesRequestDto>>
        >(`${base}/species-publication-requests${query}`);

        return normalizeTotalPage(response);
      },
      async submit(
        input: SubmitSpeciesRequestInput,
      ): Promise<SubmittedSpeciesRequestDto> {
        const response = await http.post<Enveloped<SubmittedSpeciesRequestDto>>(
          `${base}/species-publication-requests`,
          buildSpeciesRequestFormData(input),
        );

        return unwrap(response);
      },
    },
  };
}

export type VeterinarianApi = ReturnType<typeof createVeterinarianApi>;
