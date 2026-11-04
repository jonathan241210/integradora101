import { useEffect, useRef, useState } from "react";
import type { PendingAction } from "@/viewmodels/inline-list";

/**
 * Manejo del foco de las acciones en línea (dashboard-004 CA-12). La decisión
 * de a dónde va el foco es pura y comprobable; solo `useInlineFocus` toca el DOM.
 */

export type Focusable = { focus: () => void; isConnected: boolean };

/** Clave del botón que abrió una acción: `id:tipo`. */
export function triggerKey(action: PendingAction): string {
  return `${action.id}:${action.type}`;
}

/** Registro de los botones disparadores para devolverles el foco. */
export function createFocusRegistry() {
  const elements = new Map<string, Focusable>();

  return {
    /** Ref callback de un botón disparador. */
    register(key: string) {
      return (element: Focusable | null) => {
        if (element) elements.set(key, element);
        else elements.delete(key);
      };
    },
    /** Enfoca el disparador si sigue en el documento; devuelve si lo logró. */
    focus(key: string): boolean {
      const element = elements.get(key);

      if (!element || !element.isConnected) return false;

      element.focus();

      return true;
    },
  };
}

export type FocusRegistry = ReturnType<typeof createFocusRegistry>;

export type FocusTarget = { kind: "first-field" } | { kind: "trigger"; key: string } | { kind: "notice" };

/**
 * A dónde va el foco tras un cambio de edición o de acción abierta:
 * - «Editar» mueve el foco al primer campo del formulario.
 * - Al cerrar una confirmación (cancelar, Escape o confirmar) vuelve al botón
 *   disparador; si la acción fue eliminar y se confirmó, la tarjeta o fila va a
 *   desaparecer, así que el foco pasa al aviso de éxito.
 */
export function decideFocus(input: {
  previous: PendingAction | null;
  current: PendingAction | null;
  hasNotice: boolean;
  editingChanged: boolean;
}): FocusTarget | null {
  if (input.editingChanged) return { kind: "first-field" };

  if (input.previous && !input.current) {
    if (input.previous.type === "delete" && input.hasNotice) return { kind: "notice" };

    return { kind: "trigger", key: triggerKey(input.previous) };
  }

  return null;
}

/** Aplica el destino; si el disparador ya no existe, cae al aviso. */
export function applyFocus(
  target: FocusTarget | null,
  elements: { registry: FocusRegistry; notice: Focusable | null; firstField: Focusable | null },
): boolean {
  if (!target) return false;

  if (target.kind === "first-field") {
    elements.firstField?.focus();

    return Boolean(elements.firstField);
  }

  if (target.kind === "trigger" && elements.registry.focus(target.key)) return true;

  if (elements.notice?.isConnected) {
    elements.notice.focus();

    return true;
  }

  return false;
}

export function useInlineFocus({
  pendingAction,
  notice,
  editing,
  firstFieldId,
}: {
  pendingAction: PendingAction | null;
  notice: string;
  editing: object | null;
  firstFieldId: string;
}) {
  const [registry] = useState(createFocusRegistry);
  const noticeRef = useRef<HTMLDivElement | null>(null);
  const previousPending = useRef(pendingAction);
  const previousEditing = useRef(editing);

  useEffect(() => {
    const target = decideFocus({
      previous: previousPending.current,
      current: pendingAction,
      hasNotice: notice !== "",
      editingChanged: editing !== null && editing !== previousEditing.current,
    });

    previousPending.current = pendingAction;
    previousEditing.current = editing;
    applyFocus(target, {
      registry,
      notice: noticeRef.current,
      firstField: document.getElementById(firstFieldId),
    });
    // Solo reacciona a abrir o cerrar acciones y a cambiar el registro editado.
  }, [pendingAction, editing]);

  return { registerTrigger: registry.register, noticeRef };
}
