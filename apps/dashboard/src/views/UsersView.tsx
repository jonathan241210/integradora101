import { useEffect, useState, type FormEvent } from "react";
import { Alert, Badge, Button, Card, Dialog, Field, SelectField } from "@arca/ui";
import type { StaffUser, CreateStaffUserInput, UpdateStaffUserInput } from "@arca/api-client";
import { SectionHeading } from "@/components/SectionHeading";
import type { UsersViewModelState } from "@/viewmodels/useUsers";

type UserFormState = {
  email: string;
  first_name: string;
  last_name: string;
  second_last_name: string;
  department_id: string;
  role: string;
  password: string;
};

const emptyForm: UserFormState = {
  email: "",
  first_name: "",
  last_name: "",
  second_last_name: "",
  department_id: "",
  role: "",
  password: "",
};

export function UsersView({
  title,
  state,
  onSave,
  onDeactivate,
  onRetry,
  onClearNotice,
}: {
  title: string;
  state: UsersViewModelState;
  onSave: (
    input: CreateStaffUserInput | UpdateStaffUserInput,
    id?: number | string,
  ) => Promise<boolean>;
  onDeactivate: (user: StaffUser) => Promise<boolean>;
  onRetry: () => void;
  onClearNotice: () => void;
}) {
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirming, setConfirming] = useState<StaffUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!editing) {
      setForm(emptyForm);
      return;
    }

    setForm({
      email: editing.email,
      first_name: editing.first_name,
      last_name: editing.last_name,
      second_last_name: editing.second_last_name ?? "",
      department_id: editing.department ? String(editing.department.id) : "",
      role: editing.roles[0] ?? "",
      password: "",
    });
  }, [editing]);

  const setField = (field: keyof UserFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "department_id") {
      const suggested = state.catalog?.departments.find(
        (department) => String(department.id) === value,
      )?.suggested_role;
      if (suggested && !editing) {
        setForm((current) => ({ ...current, department_id: value, role: suggested }));
      }
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = {
      email: form.email,
      first_name: form.first_name,
      last_name: form.last_name,
      second_last_name: form.second_last_name || null,
      department_id: form.department_id,
      role: form.role,
    };
    const currentValues = editing
      ? {
          email: editing.email,
          first_name: editing.first_name,
          last_name: editing.last_name,
          second_last_name: editing.second_last_name,
          department_id: editing.department ? String(editing.department.id) : "",
          role: editing.roles[0] ?? "",
        }
      : null;
    const input = editing
      ? {
          ...Object.fromEntries(
            Object.entries(values).filter(([key, value]) => value !== currentValues?.[key as keyof typeof values]),
          ),
          ...(form.password ? { password: form.password } : {}),
        } as UpdateStaffUserInput
      : { ...values, password: form.password };
    const saved = await onSave(input, editing?.id);

    if (saved) {
      setEditing(null);
      setForm(emptyForm);
      setShowPassword(false);
    }
  };

  const beginCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowPassword(false);
  };

  const confirmDeactivate = async () => {
    if (!confirming) return;
    const deactivated = await onDeactivate(confirming);
    setConfirming(null);
    if (deactivated) setEditing((current) => current?.id === confirming.id ? null : current);
  };

  const fieldError = (name: string) => state.fieldErrors[name]?.[0];

  return (
    <div className="users-view">
      <SectionHeading
        eyebrow="Administración / Personal"
        title={title}
        description="Consulta y administra las cuentas de personal permitidas para tu perfil."
      />
      {state.notice && (
        <Alert className="inline-feedback" role="status" aria-live="polite">
          {state.notice}
          <Button variant="ghost" onClick={onClearNotice} aria-label="Cerrar aviso">
            Cerrar
          </Button>
        </Alert>
      )}
      {state.error && (
        <Alert className="inline-feedback" role="alert" aria-live="assertive">
          <span>{state.error}</span>
          {state.status === "error" && (
            <Button variant="secondary" onClick={onRetry}>Reintentar</Button>
          )}
        </Alert>
      )}

      <div className="users-layout">
        <Card className="users-list-card">
          <div className="users-card-heading">
            <div>
              <h2>Cuentas de personal</h2>
              <p>{state.status === "loading" ? "Cargando cuentas…" : `${state.users.length} cuentas`}</p>
            </div>
            <Button onClick={beginCreate} disabled={!state.catalog}>Crear cuenta</Button>
          </div>

          {state.status === "loading" && (
            <p role="status" aria-live="polite">Cargando cuentas y catálogo…</p>
          )}
          {state.status === "error" && (
            <p>No se pudieron cargar las cuentas. Puedes reintentar la solicitud.</p>
          )}
          {state.status === "ready" && state.users.length === 0 && (
            <p className="users-empty">No hay cuentas de personal para mostrar.</p>
          )}
          {state.status === "ready" && state.users.length > 0 && (
            <div className="users-table-scroll" role="region" tabIndex={0} aria-label="Tabla desplazable de cuentas">
              <table className="users-table">
                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Correo</th>
                    <th scope="col">Área</th>
                    <th scope="col">Rol</th>
                    <th scope="col">Estado</th>
                    <th scope="col"><span className="visually-hidden">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {state.users.map((user) => (
                    <tr key={user.id}>
                      <td data-label="Nombre">{user.full_name}</td>
                      <td data-label="Correo">{user.email}</td>
                      <td data-label="Área">{user.department?.name ?? "Sin área"}</td>
                      <td data-label="Rol">
                        {user.roles
                          .map((roleName) => state.catalog?.roles.find((role) => role.name === roleName)?.label ?? roleName)
                          .join(", ")}
                      </td>
                      <td data-label="Estado">
                        <Badge tone={user.is_active ? "success" : "neutral"}>
                          {user.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                      </td>
                      <td className="users-row-actions">
                        <Button variant="secondary" onClick={() => setEditing(user)}>Editar</Button>
                        <Button
                          variant="danger"
                          disabled={state.deactivatingId === String(user.id)}
                          onClick={() => setConfirming(user)}
                        >
                          Desactivar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {(editing || form.email || state.catalog) && (
          <Card className="users-form-card">
            <div className="users-card-heading">
              <div>
                <h2>{editing ? "Editar cuenta" : "Crear cuenta"}</h2>
                <p>Los datos se guardan en la API institucional.</p>
              </div>
              {editing && (
                <Button variant="ghost" onClick={beginCreate}>Nueva cuenta</Button>
              )}
            </div>
            <form className="users-form" onSubmit={submit} noValidate>
              <Field
                id="staff-user-first-name"
                label="Nombre"
                value={form.first_name}
                onChange={(event) => setField("first_name", event.target.value)}
                required
                aria-invalid={Boolean(fieldError("first_name"))}
                aria-describedby={fieldError("first_name") ? "staff-user-first-name-error" : undefined}
              />
              {fieldError("first_name") && <span className="users-field-error" id="staff-user-first-name-error">{fieldError("first_name")}</span>}
              <Field
                id="staff-user-last-name"
                label="Primer apellido"
                value={form.last_name}
                onChange={(event) => setField("last_name", event.target.value)}
                required
                aria-invalid={Boolean(fieldError("last_name"))}
                aria-describedby={fieldError("last_name") ? "staff-user-last-name-error" : undefined}
              />
              {fieldError("last_name") && <span className="users-field-error" id="staff-user-last-name-error">{fieldError("last_name")}</span>}
              <Field
                id="staff-user-second-last-name"
                label="Segundo apellido"
                value={form.second_last_name}
                onChange={(event) => setField("second_last_name", event.target.value)}
                aria-invalid={Boolean(fieldError("second_last_name"))}
                aria-describedby={fieldError("second_last_name") ? "staff-user-second-last-name-error" : undefined}
              />
              {fieldError("second_last_name") && <span className="users-field-error" id="staff-user-second-last-name-error">{fieldError("second_last_name")}</span>}
              <Field
                id="staff-user-email"
                label="Correo electrónico"
                type="email"
                value={form.email}
                onChange={(event) => setField("email", event.target.value)}
                required
                aria-invalid={Boolean(fieldError("email"))}
                aria-describedby={fieldError("email") ? "staff-user-email-error" : undefined}
              />
              {fieldError("email") && <span className="users-field-error" id="staff-user-email-error">{fieldError("email")}</span>}
              <SelectField
                id="staff-user-department"
                label="Área"
                value={form.department_id}
                onChange={(event) => setField("department_id", event.target.value)}
                required
                aria-invalid={Boolean(fieldError("department_id"))}
                aria-describedby={fieldError("department_id") ? "staff-user-department-error" : undefined}
              >
                <option value="">Selecciona un área</option>
                {state.catalog?.departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </SelectField>
              {fieldError("department_id") && <span className="users-field-error" id="staff-user-department-error">{fieldError("department_id")}</span>}
              <SelectField
                id="staff-user-role"
                label="Rol"
                value={form.role}
                onChange={(event) => setField("role", event.target.value)}
                required
                aria-invalid={Boolean(fieldError("role"))}
                aria-describedby={fieldError("role") ? "staff-user-role-error" : undefined}
              >
                <option value="">Selecciona un rol</option>
                {state.catalog?.roles.map((role) => (
                  <option key={role.name} value={role.name}>{role.label}</option>
                ))}
              </SelectField>
              {fieldError("role") && <span className="users-field-error" id="staff-user-role-error">{fieldError("role")}</span>}
              <div className="users-password-field">
                <Field
                  id="staff-user-password"
                  label={editing ? "Nueva contraseña (opcional)" : "Contraseña"}
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => setField("password", event.target.value)}
                  required={!editing}
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldError("password"))}
                  aria-describedby={fieldError("password") ? "staff-user-password-error" : undefined}
                />
                <Button
                  variant="ghost"
                  type="button"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </Button>
              </div>
              {fieldError("password") && <span className="users-field-error" id="staff-user-password-error">{fieldError("password")}</span>}
              <div className="users-form-actions">
                {editing && <Button variant="secondary" type="button" onClick={() => setEditing(null)}>Cancelar</Button>}
                <Button type="submit" disabled={state.submitting}>
                  {state.submitting ? "Guardando…" : editing ? "Guardar cambios" : "Crear cuenta"}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>

      <Dialog
        open={confirming !== null}
        title="Desactivar cuenta"
        onClose={() => setConfirming(null)}
      >
        <p>
          ¿Desactivar la cuenta de {confirming?.full_name}? La persona ya no podrá iniciar sesión.
        </p>
        <div className="users-form-actions">
          <Button variant="secondary" onClick={() => setConfirming(null)}>Cancelar</Button>
          <Button variant="danger" onClick={() => void confirmDeactivate()}>
            Confirmar desactivación
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
