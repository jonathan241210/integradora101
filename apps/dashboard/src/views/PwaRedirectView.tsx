import { Alert, Button, Card } from "@arca/ui";
import { Icon } from "@/components/Icon";

export function PwaRedirectView({
  pwaUrl,
  submitting = false,
  error = "",
  onSignOut,
}: {
  pwaUrl: string | null;
  /** Error del cierre de sesión (CA-20); llega en español desde el ViewModel. */
  error?: string;
  submitting?: boolean;
  /** Cierra la sesión y vuelve al inicio (dashboard-015 CA-19). */
  onSignOut: () => void;
}) {
  return (
    <main className="auth-page">
      <Card className="auth-card auth-card--redirect">
        <div className="brand-mark" aria-hidden="true">
          <Icon name="animals" />
        </div>
        <p className="auth-kicker">Acceso veterinario</p>
        <h1>Aplicación veterinaria</h1>
        {pwaUrl ? (
          <>
            <p className="auth-description">
              Tu cuenta usa la aplicación veterinaria. Te estamos redirigiendo…
            </p>
            <a className="pwa-fallback-link" href={pwaUrl}>
              Abrir la aplicación veterinaria
            </a>
          </>
        ) : (
          <p className="auth-description" role="status">
            La aplicación veterinaria no está configurada. Contacta al
            administrador.
          </p>
        )}
        {error && (
          <Alert className="auth-alert" role="alert" aria-live="assertive">
            {error}
          </Alert>
        )}
        <Button type="button" variant="secondary" disabled={submitting} onClick={onSignOut}>
          Cerrar sesión y volver al inicio
        </Button>
      </Card>
    </main>
  );
}
