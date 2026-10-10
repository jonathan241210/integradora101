import {
  forwardRef,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

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
