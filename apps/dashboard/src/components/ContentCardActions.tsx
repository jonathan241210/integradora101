import { Button } from "@arca/ui";
import type { PendingActionType } from "@/viewmodels/inline-list";

/**
 * Acciones de una tarjeta de Noticias o Eventos: «Editar», «Activar/Desactivar»
 * y «Eliminar». Las dos últimas abren la confirmación en ventana modal que
 * monta la vista con `ConfirmDialog` (dashboard-020, revisión 2026-11-21 (b)).
 */
export function ContentCardActions({
  subject,
  isActive,
  registerTrigger,
  onEdit,
  onOpen,
}: {
  /** «la noticia Título» / «el evento Nombre», para los nombres accesibles. */
  subject: string;
  isActive: boolean;
  /** Ref callback de cada botón disparador, para devolverle el foco (dashboard-004 CA-12). */
  registerTrigger: (type: PendingActionType) => (element: HTMLButtonElement | null) => void;
  onEdit: () => void;
  onOpen: (type: PendingActionType) => void;
}) {
  return (
    <div className="content-card__actions">
      <Button variant="secondary" aria-label={`Editar ${subject}`} onClick={onEdit}>
        Editar
      </Button>
      <Button
        ref={registerTrigger("status")}
        variant="secondary"
        aria-label={`${isActive ? "Desactivar" : "Activar"} ${subject}`}
        onClick={() => onOpen("status")}
      >
        {isActive ? "Desactivar" : "Activar"}
      </Button>
      <Button
        ref={registerTrigger("delete")}
        variant="danger"
        aria-label={`Eliminar ${subject}`}
        onClick={() => onOpen("delete")}
      >
        Eliminar
      </Button>
    </div>
  );
}
