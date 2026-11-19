import { Button } from "@arca/ui";
import { Icon } from "@/components/Icon";

/**
 * Etiqueta flotante del resultado ubicado y aviso accesible (dashboard-012
 * CA-22 y CA-23). La región `aria-live` está siempre montada para que el
 * lector de pantalla anuncie el cambio.
 */
export function SearchHitBanner({
  banner,
  announcement,
  onClear,
}: {
  banner: string;
  announcement: string;
  onClear: () => void;
}) {
  return (
    <>
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
      {banner && (
        <div className="search-hit-banner">
          <span>{banner}</span>
          <Button variant="ghost" aria-label="Quitar resaltado" onClick={onClear}>
            <Icon name="close" />
          </Button>
        </div>
      )}
    </>
  );
}
