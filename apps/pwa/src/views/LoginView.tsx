import type { FormEvent } from 'react';
import { Alert, Button, Card, Field } from '@arca/ui';
import { Spinner } from '@/views/Spinner';

type LoginViewProps = {
  busy?: boolean;
  error: string;
  onLogin: (username: string, password: string) => void;
};

export function LoginView({
  busy = false,
  error,
  onLogin,
}: LoginViewProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const email = fields.get('username');
    const password = fields.get('password');

    if (typeof email === 'string' && typeof password === 'string') {
      onLogin(email, password);
    }
  }

  return (
    <main className="login-page">
      <Card className="login-card">
        <div className="login-brand" aria-label="ZooHealth">
          <span className="brand-mark" aria-hidden="true">
            🐾
          </span>
          <span>ZooHealth</span>
        </div>

        <div className="login-heading">
          <p className="eyebrow">Módulo veterinario</p>
          <h1>Iniciar sesión</h1>
          <p>Accede al espacio de trabajo de cuidado animal.</p>
        </div>


        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <Alert className="login-error" role="alert">
              {error}
            </Alert>
          )}
          <Field
            autoComplete="username"
            id="demo-username"
            label="Correo electrónico"
            name="username"
            placeholder="nombre@correo.com"
            required
            type="email"
          />
          <Field
            autoComplete="current-password"
            id="demo-password"
            label="Contraseña"
            name="password"
            placeholder="Ingresa tu contraseña"
            required
            type="password"
          />
          <Button className="login-submit" disabled={busy} type="submit">
            {busy ? <Spinner label="Iniciando sesión…" /> : 'Iniciar sesión'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
