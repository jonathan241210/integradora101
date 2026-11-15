import type { PhotoSlot } from "@/viewmodels/species-requests";
import { PHOTO_LOAD_ERROR } from "@/viewmodels/species-publication-shared";

/**
 * Caja de foto con sus estados: espera, imagen (blob en memoria), error y sin
 * foto. Solo presenta la URL `blob:` que entrega el ViewModel (CA-06).
 */
export function SpeciesPhoto({
  slot,
  alt,
  noneText = "Sin foto",
}: {
  slot: PhotoSlot;
  alt: string;
  noneText?: string;
}) {
  return (
    <figure className="species-photo">
      {slot.status === "ready" ? (
        <img className="species-photo__image" src={slot.url} alt={alt} />
      ) : slot.status === "error" ? (
        <p className="species-photo__message" role="alert">
          {PHOTO_LOAD_ERROR}
        </p>
      ) : slot.status === "none" ? (
        <p className="species-photo__message">{noneText}</p>
      ) : (
        <p className="species-photo__message" role="status" aria-live="polite">
          Cargando foto…
        </p>
      )}
    </figure>
  );
}
