import { Button } from "@arca/ui";
import type { InlineConfirmCopy, PendingActionType } from "@/viewmodels/inline-list";
import { InlineConfirm } from "./InlineConfirm";

/**
 * Acciones de una tarjeta de Noticias o Eventos: «Editar», «Activar/Desactivar»
 * y «Eliminar». La acción pendiente se confirma en línea, dentro de la propia
 * tarjeta (dashboard-004 CA-08, CA-09).
 */
export function ContentCardActions({
  subject,
  isActive,
  pending,
  copy,
  busy,
  error,
  registerTrigger,
  onEdit,
  onOpen,
  onConfirm,
  onCancel,
}: {
  /** «la noticia Título» / «el evento Nombre», para los nombres accesibles. */
  subject: string;
  isActive: boolean;
  pending: PendingActionType | null;
  copy: InlineConfirmCopy | null;
  busy: boolean;
  error: string;
  /** Ref callback de cada botón disparador, para devolverle el foco (CA-12). */
  registerTrigger: (type: PendingActionType) => (element: HTMLButtonElement | null) => void;
  onEdit: () => void;
  onOpen: (type: PendingActionType) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
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
      {pending && copy && (
        <InlineConfirm
          copy={copy}
          busy={busy}
          error={error}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}
    </>
  );
}
