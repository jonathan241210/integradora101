import { useState, type FormEvent } from "react";
import { Badge, Button, Card, Field } from "@arca/ui";
import { DemoBanner } from "@/components/DemoBanner";
import { SectionHeading } from "@/components/SectionHeading";
import type { DemoTicketUser } from "@/data/demo-data";

export function TicketUsersView({
  users,
  onAdd,
}: {
  users: DemoTicketUser[];
  onAdd: (name: string, username: string, password: string) => void;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const createUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onAdd(name, username, password);
  };

  return (
    <>
      <SectionHeading
        eyebrow="Administración / Taquilla"
        title="Usuarios de taquilla"
        description="Crea cuentas ficticias para probar el ingreso al perfil de taquilla."
      />
      <DemoBanner />
      <Card className="ticket-user-form-card">
        <div className="card-heading">
          <div>
            <h2>Crear usuario de demostración</h2>
            <p>La cuenta solo estará disponible mientras esta página siga abierta.</p>
          </div>
          <Badge tone="warning">Sin guardado real</Badge>
        </div>
        <form className="ticket-user-form" onSubmit={createUser}>
          <Field
            id="ticket-user-name"
            label="Nombre de muestra"
            autoComplete="off"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Field
            id="ticket-user-username"
            label="Usuario"
            autoComplete="off"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <Field
            id="ticket-user-password"
            label="Contraseña ficticia"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit">Crear usuario de muestra</Button>
        </form>
      </Card>

      <Card className="ticket-user-list-card">
        <div className="card-heading">
          <div>
            <h2>Cuentas ficticias</h2>
            <p>Podrás probarlas en el acceso de Taquilla antes de recargar.</p>
          </div>
          <Badge tone="info">{users.length} en memoria</Badge>
        </div>
        <ul className="ticket-user-list">
          {users.map((user) => (
            <li key={user.id}>
              <span className="ticket-user-avatar" aria-hidden="true">
                {user.name.slice(0, 1).toLocaleUpperCase()}
              </span>
              <span>
                <strong>{user.name}</strong>
                <small>{user.username}</small>
              </span>
              <Badge tone="neutral">Demostración</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
