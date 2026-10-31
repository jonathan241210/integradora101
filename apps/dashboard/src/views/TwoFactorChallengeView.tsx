import { useState, type FormEvent } from "react";
import type { TwoFactorChallenge } from "@arca/api-client";
import { Alert, Button, Card, Field } from "@arca/ui";
import { Icon } from "@/components/Icon";

export function TwoFactorChallengeView({
  error,
  submitting,
  onSubmit,
  onCancel,
}: {
  error: string;
  submitting: boolean;
  onSubmit: (challenge: TwoFactorChallenge) => void;
  onCancel: () => void;
}) {
  const [recoveryCodeMode, setRecoveryCodeMode] = useState(false);
  const [code, setCode] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = code.trim();
    if (!value) return;

    onSubmit(
      recoveryCodeMode ? { recovery_code: value } : { code: value },
    );
  };

  const switchMode = () => {
    setRecoveryCodeMode((current) => !current);
    setCode("");
  };

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <div className="brand-mark" aria-hidden="true">
          <Icon name="animals" />
        </div>
        <p className="auth-kicker">Verificación de seguridad</p>
        <h1>Confirma tu identidad</h1>
        <p className="auth-description">
          {recoveryCodeMode
            ? "Escribe uno de tus códigos de recuperación."
            : "Escribe el código de seis dígitos de tu app autenticadora."}
        </p>
        <form className="auth-form" onSubmit={submit}>
          <Field
            id="two-factor-code"
            label={recoveryCodeMode ? "Código de recuperación" : "Código de autenticación"}
            autoComplete={recoveryCodeMode ? "off" : "one-time-code"}
            inputMode={recoveryCodeMode ? "text" : "numeric"}
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          {error && (
            <Alert className="auth-alert" role="alert" aria-live="assertive">
              {error}
            </Alert>
          )}
          <Button className="auth-submit" type="submit" disabled={submitting || !code.trim()}>
            {submitting ? "Verificando…" : "Continuar"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-pressed={recoveryCodeMode}
            onClick={switchMode}
          >
            {recoveryCodeMode ? "Usar código de autenticación" : "Usar código de recuperación"}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Volver al inicio de sesión
          </Button>
        </form>
      </Card>
    </main>
  );
}
