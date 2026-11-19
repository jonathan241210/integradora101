import type {
  SpeciesCategory,
  SpeciesFichaField,
  SpeciesPublicationStatus,
  SpeciesRequestStatus,
  SpeciesRequestType,
} from "./admin-types";

/**
 * Elemento del selector `GET /api/v1/veterinarian/species` (api-014 CA-26).
 * `published_fields` llega como lista de claves o `null` si la especie nunca
 * se publicó.
 */
export type SelectableSpeciesDto = {
  id: number;
  common_name: string;
  scientific_name: string | null;
  habitat: string | null;
  origin: string | null;
  category: SpeciesCategory | null;
  publication_status: SpeciesPublicationStatus;
  next_request_type: SpeciesRequestType | null;
  last_rejection_reason: string | null;
  published_fields: readonly string[] | null;
};

/** Elemento de «Mis solicitudes» (api-014 CA-33). */
export type OwnSpeciesRequestDto = {
  id: number;
  species_id: number;
  common_name: string;
  request_type: SpeciesRequestType;
  status: SpeciesRequestStatus;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  species_publication_status: SpeciesPublicationStatus;
};

export type SubmitSpeciesRequestInput = {
  species_id: number;
  category: SpeciesCategory;
  scientific_name?: string;
  habitat?: string;
  origin?: string;
  published_fields: readonly SpeciesFichaField[];
  image?: Blob | null;
};

export type SubmittedSpeciesRequestDto = {
  id: number;
  species_id: number;
  status: SpeciesRequestStatus;
  request_type: SpeciesRequestType;
  created_at: string;
};
