import type { ReactNode } from "react";
import { Button, Card } from "@arca/ui";

/**
 * Panel de formulario que se minimiza y se expande (dashboard-004 CA-03).
 * No guarda estado propio: `expanded` y `onToggle` vienen del ViewModel
 * (RN-11). El contenido se oculta con `hidden` y sigue montado, así que no se
 * pierde lo escrito ni el archivo elegido.
 */
export function FormPanel({
  id,
  title,
  description,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Card className="form-card form-panel">
      <div className="form-panel__header">
        <div>
          <h2 id={`${id}-title`}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="form-panel__toggle"
          aria-expanded={expanded}
          aria-controls={`${id}-content`}
          onClick={onToggle}
        >
          {expanded ? "Minimizar formulario" : "Expandir formulario"}
        </Button>
      </div>
      <div
        id={`${id}-content`}
        className="form-panel__content"
        role="region"
        aria-labelledby={`${id}-title`}
        hidden={!expanded}
      >
        {children}
      </div>
    </Card>
  );
}
