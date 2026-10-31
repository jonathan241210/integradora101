import { Card } from "@arca/ui";
import { Icon } from "@/components/Icon";

export function PwaRedirectView({ pwaUrl }: { pwaUrl: string | null }) {
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
      </Card>
    </main>
  );
}
