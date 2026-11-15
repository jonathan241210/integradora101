import type { MemoryImageState } from "@/viewmodels/memory-review";
import { MEMORY_IMAGE_ALT, MEMORY_IMAGE_ERROR_MESSAGE } from "@/viewmodels/memory-review-shared";

/**
 * Imagen de la petición con sus estados. Solo presenta la URL `blob:` que
 * entrega el ViewModel: no la pide (CA-06, CA-17, CA-18).
 */
export function MemoryImage({ image }: { image: MemoryImageState }) {
  return (
    <figure className="memory-review__figure">
      {image.status === "ready" ? (
        <img className="memory-review__image" src={image.url} alt={MEMORY_IMAGE_ALT} />
      ) : image.status === "error" || image.status === "not-found" ? (
        <p className="memory-review__figure-message" role="alert">
          {MEMORY_IMAGE_ERROR_MESSAGE}
        </p>
      ) : (
        <p className="memory-review__figure-message" role="status" aria-live="polite">
          Cargando la foto…
        </p>
      )}
    </figure>
  );
}
