import { useState, type FormEvent } from "react";
import { Alert, Button, Card, Field } from "@arca/ui";
import { Icon } from "@/components/Icon";

export function TwoFactorSetupView({
  qrSvg,
  recoveryCodes,
  error,
  submitting,
  onConfirm,
  onAcknowledge,
  onRetry,
}: {
  qrSvg: string | null;
  recoveryCodes: string[];
  error: string;
  submitting: boolean;
  onConfirm: (code: string) => void;
  onAcknowledge: () => void;
  onRetry: () => void;
}) {
  const [code, setCode] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (code.trim()) onConfirm(code.trim());
  };

  return (
    <main className="auth-page">
      <Card className="auth-card auth-card--setup">
        <div className="brand-mark" aria-hidden="true">
          <Icon name="animals" />
        </div>
        <p className="auth-kicker">Verificación de seguridad</p>
        <h1>Configura tu segundo factor</h1>
        <p className="auth-description">
          Instala una app autenticadora y escanea el código QR. Después confirma
          con el código de seis dígitos que muestra la app.
        </p>

        {qrSvg && (
          <div className="two-factor-qr">
            <img
              src={`data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}`}
              alt="Código QR para tu app autenticadora"
            />
          </div>
        )}

        {recoveryCodes.length > 0 ? (
          <section className="recovery-codes" aria-labelledby="recovery-codes-title">
            <h2 id="recovery-codes-title">Guarda tus códigos de recuperación</h2>
            <p>
              Solo se muestran ahora. Guárdalos en un lugar seguro; no podrás
              volver a consultarlos desde esta pantalla.
            </p>
            <ul>
              {recoveryCodes.map((recoveryCode) => (
                <li key={recoveryCode}>
                  <code>{recoveryCode}</code>
                </li>
              ))}
            </ul>
            <Button className="auth-submit" type="button" onClick={onAcknowledge}>
              Ya guardé mis códigos
            </Button>
          </section>
        ) : !qrSvg && error && !submitting ? (
          <>
            <Alert className="auth-alert" role="alert" aria-live="assertive">
              {error}
            </Alert>
            <Button className="auth-submit" type="button" onClick={onRetry}>
              Reintentar
            </Button>
          </>
        ) : submitting ? (
          <p className="auth-loading" role="status" aria-live="polite">
            {qrSvg ? "Validando el código…" : "Preparando tu segundo factor…"}
          </p>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <Field
              id="two-factor-confirmation-code"
              label="Código de autenticación"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            {error && (
              <Alert className="auth-alert" role="alert" aria-live="assertive">
                {error}
              </Alert>
            )}
            <Button className="auth-submit" type="submit" disabled={!qrSvg || !code.trim()}>
              Confirmar segundo factor
            </Button>
          </form>
        )}

      </Card>
    </main>
  );
}
