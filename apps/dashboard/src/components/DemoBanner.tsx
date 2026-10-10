import { Alert } from "@arca/ui";

export function DemoBanner() {
  return (
    <Alert className="demo-banner">
      <span className="demo-banner__dot" aria-hidden="true" />
      <span>
        <strong>Prototipo de demostración.</strong> Datos y acciones ficticios;
        no se guardan cambios ni se realizan cobros.
      </span>
    </Alert>
  );
}
