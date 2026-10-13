import { useState, type FormEvent } from 'react';
import { Alert, Button, Card, Field } from '@arca/ui';
import { demoCredentials } from '@/viewmodels/pwaDemo';
import type { PwaInstallController } from '@/viewmodels/usePwaInstall';
import { InstallAppAction } from '@/views/InstallAppAction';

type LoginViewProps = {
  error: string;
  installController: PwaInstallController;
  onLogin: (username: string, password: string) => void;
};

export function LoginView({
  error,
  installController,
  onLogin,
}: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onLogin(username, password);
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

        <Alert className="demo-notice" role="note">
          Modo demostración: este acceso no autentica ni protege información.
        </Alert>
        <InstallAppAction controller={installController} />

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
            onChange={(event) => setUsername(event.target.value)}
            placeholder="veterinario@demo.local"
            required
            type="email"
            value={username}
          />
          <Field
            autoComplete="current-password"
            id="demo-password"
            label="Contraseña"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Ingresa tu contraseña"
            required
            type="password"
            value={password}
          />
          <Button className="login-submit" type="submit">
            Entrar a la demostración
          </Button>
        </form>

        <div className="demo-credentials">
          <p className="demo-credentials-title">Credenciales de demostración</p>
          <p>
            Usuario: <strong>{demoCredentials.username}</strong>
          </p>
          <p>
            Contraseña: <strong>{demoCredentials.password}</strong>
          </p>
          <small>No uses estas credenciales para cuentas reales.</small>
        </div>
      </Card>
    </main>
  );
}
