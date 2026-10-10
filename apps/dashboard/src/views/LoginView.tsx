import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alert, Button, Card, Field } from "@arca/ui";
import { DemoBanner } from "@/components/DemoBanner";
import { Icon } from "@/components/Icon";
import {
  demoAdministrationCredentials,
  demoTicketUsers,
} from "@/data/demo-data";
import type { DemoProfile } from "@/viewmodels/dashboard-demo";

export function LoginView({
  selectedProfile,
  error,
  onSelectProfile,
  onLoginAdministration,
  onLoginTicket,
}: {
  selectedProfile: DemoProfile | null;
  error: string;
  onSelectProfile: (profile: DemoProfile) => void;
  onLoginAdministration: (username: string, password: string) => void;
  onLoginTicket: (username: string, password: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const administrationButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!selectedProfile) administrationButtonRef.current?.focus();
    setUsername("");
    setPassword("");
  }, [selectedProfile]);

  const submitTicketLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onLoginTicket(username, password);
  };

  const submitAdministrationLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onLoginAdministration(username, password);
  };

  return (
    <main className="login-page">
      <div className="login-backdrop login-backdrop--one" aria-hidden="true" />
      <div className="login-backdrop login-backdrop--two" aria-hidden="true" />
      <Card className="login-card">
        <div className="brand-mark" aria-hidden="true">
          <Icon name="animals" />
        </div>
        <p className="login-kicker">Zoológico Nicolás Bravo</p>
        <h1>Panel administrativo</h1>
        <p className="login-description">
          Elige un perfil para recorrer las funciones de demostración.
        </p>
        <DemoBanner />

        <div
          className="profile-choices"
          role="group"
          aria-label="Selecciona un perfil"
        >
          <Button
            ref={administrationButtonRef}
            className="profile-choice"
            type="button"
            variant={selectedProfile === "administration" ? "primary" : "secondary"}
            aria-pressed={selectedProfile === "administration"}
            onClick={() => onSelectProfile("administration")}
          >
            <Icon name="building" />
            <span>
              <strong>Administración</strong>
              <small>Panel, recintos y usuarios de taquilla</small>
            </span>
          </Button>
          <Button
            className="profile-choice"
            type="button"
            variant={selectedProfile === "ticket" ? "primary" : "secondary"}
            aria-pressed={selectedProfile === "ticket"}
            onClick={() => onSelectProfile("ticket")}
          >
            <Icon name="ticket" />
            <span>
              <strong>Taquilla</strong>
              <small>Venta e historial de muestra</small>
            </span>
          </Button>
        </div>

        {selectedProfile === "administration" && (
          <form className="profile-login-form" onSubmit={submitAdministrationLogin}>
            <h2>Ingreso de administración</h2>
            <p className="login-hint">
              Usa solo las credenciales ficticias de esta demostración.
            </p>
            <Field
              id="administration-username"
              label="Usuario de demostración"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <Field
              id="administration-password"
              label="Contraseña de demostración"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <div className="demo-credentials" role="note">
              <strong>Credenciales ficticias para probar</strong>
              <span>Usuario: {demoAdministrationCredentials.username}</span>
              <span>Contraseña: {demoAdministrationCredentials.password}</span>
              <small>No uses estas credenciales fuera de esta página de muestra.</small>
            </div>
            {error && (
              <Alert role="alert" aria-live="assertive">
                {error}
              </Alert>
            )}
            <Button className="login-submit" type="submit">
              Ingresar a administración
              <Icon name="enter" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onSelectProfile("ticket")}
            >
              Cambiar de perfil
            </Button>
          </form>
        )}

        {selectedProfile === "ticket" && (
          <form className="profile-login-form" onSubmit={submitTicketLogin}>
            <h2>Ingreso de personal de taquilla</h2>
            <Field
              id="ticket-username"
              label="Usuario de demostración"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <Field
              id="ticket-password"
              label="Contraseña de demostración"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <div className="demo-credentials" role="note">
              <strong>Credenciales ficticias para probar</strong>
              <span>Usuario: {demoTicketUsers[0].username}</span>
              <span>Contraseña: {demoTicketUsers[0].password}</span>
              <small>No uses estas credenciales fuera de esta página de muestra.</small>
            </div>
            {error && (
              <Alert role="alert" aria-live="assertive">
                {error}
              </Alert>
            )}
            <Button className="login-submit" type="submit">
              Ingresar a taquilla
              <Icon name="enter" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onSelectProfile("administration")}
            >
              Cambiar de perfil
            </Button>
          </form>
        )}

        <p className="login-footer">
          Vista de muestra · No autentica ni protege información
        </p>
      </Card>
    </main>
  );
}
