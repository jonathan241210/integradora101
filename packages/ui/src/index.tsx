import {
  forwardRef,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type FormEvent,
  type TextareaHTMLAttributes,
} from "react";
import {
  rateLimitedPrefix,
  rateLimitEndedText,
  rateLimitText,
  formatCountdown,
} from "./countdown";
import type { CountdownState } from "./useCountdown";
import { buildPagination, type PaginationInput } from "./pagination";

export * from "./countdown";
export * from "./pagination";
export { useCountdown, type CountdownState } from "./useCountdown";
export * from "./delayedFlag";
export { useDelayedFlag } from "./useDelayedFlag";
export * from "./skeleton";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className = "", variant = "primary", ...props }, ref) {
    return (
      <button
        ref={ref}
        className={`arca-button arca-button--${variant} ${className}`.trim()}
        {...props}
      />
    );
  },
);

export function Card({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`arca-card ${className}`.trim()} {...props} />;
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  function Field({ className = "", id, label, hint, ...props }, ref) {
    const fieldId = id ?? props.name;
    const hintId = hint && fieldId ? `${fieldId}-hint` : undefined;

    return (
      <div className="arca-field">
        <label className="arca-field__label" htmlFor={fieldId}>
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          className={`arca-field__control ${className}`.trim()}
          aria-describedby={hintId}
          {...props}
        />
        {hint && (
          <span className="arca-field__hint" id={hintId}>
            {hint}
          </span>
        )}
      </div>
    );
  },
);

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  children: ReactNode;
};

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField({ className = "", id, label, children, ...props }, ref) {
    const fieldId = id ?? props.name;

    return (
      <div className="arca-field">
        <label className="arca-field__label" htmlFor={fieldId}>
          {label}
        </label>
        <select
          ref={ref}
          id={fieldId}
          className={`arca-field__control ${className}`.trim()}
          {...props}
        >
          {children}
        </select>
      </div>
    );
  },
);

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  TextAreaFieldProps
>(function TextAreaField({ className = "", id, label, ...props }, ref) {
  const fieldId = id ?? props.name;

  return (
    <div className="arca-field">
      <label className="arca-field__label" htmlFor={fieldId}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={fieldId}
        className={`arca-field__control arca-field__control--textarea ${className}`.trim()}
        {...props}
      />
    </div>
  );
});

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return <span className={`arca-badge arca-badge--${tone}`}>{children}</span>;
}

export function Alert({
  children,
  className = "",
  role = "status",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`arca-alert ${className}`.trim()}
      role={role}
      {...props}
    >
      {children}
    </div>
  );
}

export function Dialog({
  open,
  title,
  children,
  onClose,
  className = "",
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = `dialog-title-${title.toLowerCase().replaceAll(" ", "-")}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={`arca-dialog ${className}`.trim()}
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <h2 className="arca-dialog__title" id={titleId}>
        {title}
      </h2>
      {children}
    </dialog>
  );
}

/**
 * Paginación compartida. Con total: «Página N de M · T en total», anterior,
 * números (con «…» si hay más de 7 páginas) y siguiente. Solo con `hasMore`
 * (respaldo): «Página N», anterior y siguiente. No conoce endpoints.
 */
export function Pagination({
  onPageChange,
  ...input
}: PaginationInput & { onPageChange: (page: number) => void }) {
  const model = buildPagination(input);
  const busy = input.busy === true;

  return (
    <nav className="pagination-bar" aria-label="Paginación">
      <span className="pagination-bar__summary" aria-live="polite">
        {model.summary}
      </span>
      <div className="pagination-bar__actions">
        <Button
          variant="secondary"
          disabled={model.previousDisabled}
          onClick={() => onPageChange(model.previousPage)}
        >
          Anterior
        </Button>
        {model.items.map((item) =>
          item.type === "gap" ? (
            <span key={item.key} className="pagination-bar__gap" aria-hidden="true">
              …
            </span>
          ) : (
            <Button
              key={item.number}
              variant={item.current ? "primary" : "secondary"}
              disabled={busy}
              aria-label={`Ir a la página ${item.number}`}
              aria-current={item.current ? "page" : undefined}
              onClick={() => onPageChange(item.number)}
            >
              {item.number}
            </Button>
          ),
        )}
        <Button
          variant="secondary"
          disabled={model.nextDisabled}
          onClick={() => onPageChange(model.nextPage)}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}

/**
 * Aviso de bloqueo por intentos con contador `m:ss`. Los dígitos van en
 * `aria-live="off"`; el lector solo oye el aviso inicial y el de fin, desde
 * una región `role="status"` oculta que existe siempre. Sin cuenta
 * (`countdown.remaining === null`) no pinta el aviso visible.
 */
export function LockoutNotice({
  countdown,
  initialSeconds,
  id,
  alertClassName = "",
}: {
  countdown: CountdownState;
  /** Segundos con los que arrancó la cuenta (texto fijo del primer anuncio). */
  initialSeconds: number | null;
  id?: string;
  /** Clases de la app para ubicar el aviso (por ejemplo ancho o color de error). */
  alertClassName?: string;
}) {
  const { remaining, running, finished } = countdown;
  const announcement =
    remaining === null ? "" : finished ? rateLimitEndedText : rateLimitText(initialSeconds ?? remaining);

  return (
    <>
      <div className="arca-visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      {remaining !== null && (
        <Alert id={id} className={alertClassName} role="presentation">
          {running ? (
            <>
              {rateLimitedPrefix}{" "}
              <span aria-live="off" aria-atomic="true" data-testid="lockout-countdown">
                {formatCountdown(remaining)}
              </span>
            </>
          ) : (
            rateLimitEndedText
          )}
        </Alert>
      )}
    </>
  );
}

export type ConfirmDialogCopy = {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
};

/**
 * Diálogo de confirmación explícita sobre `Dialog` (`<dialog>` modal: foco
 * atrapado y cierre con Escape). `idleTitle` mantiene un identificador único
 * mientras está cerrado. El mensaje de error llega ya resuelto en `error`
 * (la app decide cómo presentarlo).
 */
export function ConfirmDialog({
  copy,
  idleTitle,
  busy,
  confirmDisabled = false,
  error,
  onConfirm,
  onCancel,
  children,
  className = "",
}: {
  copy: ConfirmDialogCopy | null;
  idleTitle: string;
  busy: boolean;
  /** Deshabilita solo «Confirmar» (p. ej. mientras se cotiza). */
  confirmDisabled?: boolean;
  error?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
  className?: string;
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!busy && !confirmDisabled) onConfirm();
  };

  return (
    <Dialog
      open={copy !== null}
      title={copy?.title ?? idleTitle}
      onClose={onCancel}
      className={`arca-confirm-dialog ${className}`.trim()}
    >
      {copy && (
        <form className="arca-confirm-dialog__form" onSubmit={submit}>
          <p className="arca-confirm-dialog__message">{copy.message}</p>
          {children}
          {error}
          <div className="arca-confirm-dialog__actions">
            <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={copy.danger ? "danger" : "primary"}
              disabled={busy || confirmDisabled}
            >
              {busy ? "Procesando…" : copy.confirmLabel}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
