import { Alert, Button } from '@arca/ui';
import type { PwaInstallController } from '@/viewmodels/usePwaInstall';

export function InstallAppAction({
  controller,
}: {
  controller: PwaInstallController;
}) {
  if (controller.mode === 'hidden') return null;

  return (
    <div className="install-action">
      {controller.mode === 'prompt' ? (
        <Button
          aria-label="Instalar ZooHealth en este dispositivo"
          className="install-button"
          onClick={() => void controller.install()}
          variant="secondary"
        >
          Instalar app
        </Button>
      ) : (
        <details
          aria-label="Instrucciones para instalar ZooHealth"
          className="install-guide"
        >
          <summary className="install-guide-trigger">Instalar en teléfono</summary>
          {controller.platform === 'ios' ? (
            <ol>
              <li>Abre esta página en Safari y toca el botón Compartir.</li>
              <li>Elige “Añadir a pantalla de inicio”.</li>
              <li>Confirma con “Añadir”.</li>
            </ol>
          ) : (
            <ol>
              <li>Abre el menú de tu navegador.</li>
              <li>Elige “Instalar aplicación” o “Añadir a pantalla de inicio”.</li>
              <li>Confirma la instalación cuando el navegador lo solicite.</li>
            </ol>
          )}
          <small>La instalación requiere abrir el sitio mediante HTTPS.</small>
        </details>
      )}

      {controller.feedback && (
        <Alert className="install-feedback" role="status">
          {controller.feedback}
        </Alert>
      )}
      {controller.error && (
        <Alert className="install-feedback install-error" role="alert">
          {controller.error}
        </Alert>
      )}
    </div>
  );
}
