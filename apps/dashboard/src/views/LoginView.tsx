import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alert, Button, Card, Field, LockoutNotice, useCountdown, validRetryAfter } from "@arca/ui";
import { Icon } from "@/components/Icon";

export function LoginView({
  error,
  submitting,
  sessionExpired,
  retryAfterSeconds = null,
  onSubmit,
}: {
  error: string;
  submitting: boolean;
  sessionExpired: boolean;
  /** Segundos de bloqueo de un 429 (CA-21); sin ellos se muestra el mensaje de la API. */
  retryAfterSeconds?: number | null;
  onSubmit: (email: string, password: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const countdown = useCountdown(retryAfterSeconds);
  const counting = validRetryAfter(retryAfterSeconds) !== null;

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(email.trim(), password);
  };

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <div className="brand-mark" aria-hidden="true">
          <Icon name="animals" />
        </div>
        <p className="auth-kicker">Zoológico Nicolás Bravo</p>
        <h1>Inicio de sesión</h1>
        <p className="auth-description">
          Ingresa con tu correo institucional y contraseña.
        </p>
        {sessionExpired && (
          <Alert className="auth-alert" role="alert" aria-live="assertive">
            {error || "Tu sesión expiró. Vuelve a iniciar sesión."}
          </Alert>
        )}
        <form className="auth-form" onSubmit={submit}>
          <Field
            ref={emailRef}
            id="staff-email"
            type="email"
            label="Correo institucional"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Field
            id="staff-password"
            type={passwordVisible ? "text" : "password"}
            label="Contraseña"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button
            className="password-visibility-toggle"
            type="button"
            variant="ghost"
            aria-controls="staff-password"
            aria-pressed={passwordVisible}
            aria-label={passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
          </Button>
          <LockoutNotice
            countdown={countdown}
            initialSeconds={validRetryAfter(retryAfterSeconds)}
            alertClassName="auth-alert dialog-alert"
          />
          {error && !sessionExpired && !counting && (
            <Alert className="auth-alert" role="alert" aria-live="assertive">
              {error}
            </Alert>
          )}
          <Button
            className="auth-submit"
            type="submit"
            disabled={submitting || countdown.running || !email.trim() || !password}
          >
            {submitting ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
