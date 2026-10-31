import { useState, type FormEvent } from "react";
import { Alert, Badge, Button, Card, Dialog, Field, SelectField } from "@arca/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { FieldErrors, fieldErrorProps } from "@/components/FieldErrors";
import { DialogFormFooter } from "@/components/FormActions";
import { ListStatusMessage } from "@/components/ListStatusMessage";
import { NoticeBar } from "@/components/NoticeBar";
import { PaginationBar } from "@/components/PaginationBar";
import { SectionHeading } from "@/components/SectionHeading";
import type { StaffAccountDto, StaffOptionsDto } from "@/viewmodels/admin-types";
import { formatDateTime } from "@/viewmodels/formatters";
import {
  emptyStaffForm,
  getStaffConfirmation,
  parseStatusFilter,
  staffFormFromAccount,
  suggestRole,
  type StaffAccountsViewModel,
  type StaffFormValues,
} from "@/viewmodels/staff-accounts";

type StaffFormProps = {
  account: StaffAccountDto | null;
  options: StaffOptionsDto | null;
  errors: Record<string, string[]>;
  error: string;
  busy: boolean;
  onSubmit: (values: StaffFormValues) => void;
  onCancel: () => void;
};

function StaffForm({
  account,
  options,
  errors,
  error,
  busy,
  onSubmit,
  onCancel,
}: StaffFormProps) {
  const editing = account !== null;
  const [values, setValues] = useState<StaffFormValues>(
    account ? staffFormFromAccount(account) : emptyStaffForm(),
  );
  const [passwordVisible, setPasswordVisible] = useState(false);
  const set = (field: keyof StaffFormValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const changeDepartment = (departmentId: string) =>
    setValues((current) => ({
      ...current,
      department_id: departmentId,
      role: editing
        ? current.role
        : suggestRole(options, departmentId) || current.role,
    }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(values);
  };

  const field = (name: keyof StaffFormValues) => ({
    id: `staff-${name}`,
    ...fieldErrorProps(`staff-${name}`, errors, name),
  });

  return (
    <form className="dialog-form" onSubmit={submit}>
      <Field
        {...field("first_name")}
        label="Nombre"
        autoComplete="off"
        required
        value={values.first_name}
        onChange={(event) => set("first_name", event.target.value)}
      />
      <FieldErrors id="staff-first_name" errors={errors} name="first_name" />
      <Field
        {...field("last_name")}
        label="Apellido paterno"
        autoComplete="off"
        required
        value={values.last_name}
        onChange={(event) => set("last_name", event.target.value)}
      />
      <FieldErrors id="staff-last_name" errors={errors} name="last_name" />
      <Field
        {...field("second_last_name")}
        label="Apellido materno"
        autoComplete="off"
        value={values.second_last_name}
        onChange={(event) => set("second_last_name", event.target.value)}
      />
      <FieldErrors id="staff-second_last_name" errors={errors} name="second_last_name" />
      <Field
        {...field("email")}
        label="Correo institucional"
        type="email"
        autoComplete="off"
        required
        readOnly={editing}
        hint={editing ? "El correo no se puede modificar." : undefined}
        value={values.email}
        onChange={(event) => set("email", event.target.value)}
      />
      <FieldErrors id="staff-email" errors={errors} name="email" />
      <SelectField
        {...field("department_id")}
        label="Área"
        required
        value={values.department_id}
        onChange={(event) => changeDepartment(event.target.value)}
      >
        <option value="">Selecciona un área</option>
        {options?.departments.map((department) => (
          <option value={String(department.id)} key={department.id}>
            {department.name}
          </option>
        ))}
      </SelectField>
      <FieldErrors id="staff-department_id" errors={errors} name="department_id" />
      <SelectField
        {...field("role")}
        label="Rol"
        required
        value={values.role}
        onChange={(event) => set("role", event.target.value)}
      >
        <option value="">Selecciona un rol</option>
        {options?.roles.map((role) => (
          <option value={role.name} key={role.name}>
            {role.label}
          </option>
        ))}
      </SelectField>
      <FieldErrors id="staff-role" errors={errors} name="role" />
      {!editing && (
        <>
          <Field
            {...field("password")}
            label="Contraseña inicial"
            type={passwordVisible ? "text" : "password"}
            autoComplete="new-password"
            required
            value={values.password}
            onChange={(event) => set("password", event.target.value)}
          />
          <FieldErrors id="staff-password" errors={errors} name="password" />
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
        </>
      )}
      <DialogFormFooter
        error={error}
        busy={busy}
        submitLabel={editing ? "Guardar cambios" : "Crear usuario"}
        onCancel={onCancel}
      />
    </form>
  );
}

export function UsersView({ state, actions }: StaffAccountsViewModel) {
  const { query, options, meta, items, status, dialog } = state;
  const [searchText, setSearchText] = useState(query.search);
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);

  const formDialog =
    dialog?.kind === "create" || dialog?.kind === "edit" ? dialog : null;
  const confirmation = getStaffConfirmation(dialog);
  const sectionError = dialog === null ? state.actionError : "";

  const resetPasswordField = () => {
    setPassword("");
    setPasswordVisible(false);
  };
  const cancelConfirmation = () => {
    resetPasswordField();
    actions.closeDialog();
  };
  const confirm = () => {
    const sent = password;
    resetPasswordField();
    actions.confirm(sent);
  };

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    actions.changeQuery({ search: searchText });
  };

  const columns: DataTableColumn<StaffAccountDto>[] = [
    { key: "name", header: "Nombre", render: (account) => <strong>{account.full_name}</strong> },
    { key: "email", header: "Correo", render: (account) => account.email },
    { key: "department", header: "Área", render: (account) => account.department?.name ?? "—" },
    { key: "role", header: "Rol", render: (account) => account.role?.label ?? "—" },
    {
      key: "status",
      header: "Estado",
      render: (account) => (
        <Badge tone={account.is_active ? "success" : "neutral"}>
          {account.is_active ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
    {
      key: "last-login",
      header: "Último acceso",
      render: (account) => formatDateTime(account.last_login_at),
    },
    {
      key: "actions",
      header: "Acciones",
      render: (account) => (
        <div className="row-actions">
          <Button
            variant="secondary"
            aria-label={`Editar cuenta de ${account.full_name}`}
            onClick={() => actions.openDialog({ kind: "edit", account })}
          >
            Editar
          </Button>
          <Button
            variant="secondary"
            aria-label={`${account.is_active ? "Desactivar" : "Activar"} cuenta de ${account.full_name}`}
            onClick={() => actions.openDialog({ kind: "status", account })}
          >
            {account.is_active ? "Desactivar" : "Activar"}
          </Button>
          <Button
            variant="secondary"
            aria-label={`Restablecer contraseña de ${account.full_name}`}
            onClick={() => actions.openDialog({ kind: "password", account })}
          >
            Contraseña
          </Button>
          <Button
            variant="secondary"
            aria-label={`Restablecer 2FA de ${account.full_name}`}
            onClick={() => actions.openDialog({ kind: "two-factor", account })}
          >
            2FA
          </Button>
          <Button
            variant="danger"
            aria-label={`Eliminar cuenta de ${account.full_name}`}
            onClick={() => actions.openDialog({ kind: "delete", account })}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <SectionHeading
        eyebrow="Administración"
        title="Usuarios"
        description="Gestiona las cuentas del personal del zoológico."
      />
      <NoticeBar message={state.notice} onDismiss={actions.dismissNotice} />
      {sectionError && (
        <Alert className="inline-alert" role="alert" aria-live="assertive">
          {sectionError}
        </Alert>
      )}
      {state.optionsError && (
        <Alert className="inline-alert" role="alert" aria-live="assertive">
          {state.optionsError}
        </Alert>
      )}

      <Card className="filter-card">
        <form
          className="filter-form filter-form--users"
          role="search"
          aria-label="Buscar y filtrar usuarios"
          onSubmit={search}
        >
          <Field
            id="users-search"
            label="Buscar"
            type="search"
            placeholder="Nombre o correo"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <SelectField
            id="users-filter-role"
            label="Rol"
            value={query.role}
            onChange={(event) => actions.changeQuery({ role: event.target.value })}
          >
            <option value="">Todos los roles</option>
            {options?.roles.map((role) => (
              <option value={role.name} key={role.name}>
                {role.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            id="users-filter-department"
            label="Área"
            value={query.department_id}
            onChange={(event) => actions.changeQuery({ department_id: event.target.value })}
          >
            <option value="">Todas las áreas</option>
            {options?.departments.map((department) => (
              <option value={String(department.id)} key={department.id}>
                {department.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            id="users-filter-status"
            label="Estado"
            value={query.status}
            onChange={(event) =>
              actions.changeQuery({ status: parseStatusFilter(event.target.value) })
            }
          >
            <option value="">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </SelectField>
          <div className="filter-actions">
            <Button type="submit">Buscar</Button>
            <Button type="button" onClick={() => actions.openDialog({ kind: "create" })}>
              Crear usuario
            </Button>
          </div>
        </form>
      </Card>

      <Card className="table-card">
        <div className="card-heading">
          <div>
            <h2>Cuentas del personal</h2>
            <p>{meta ? `${meta.total} cuentas encontradas` : "Cargando cuentas"}</p>
          </div>
        </div>
        <ListStatusMessage
          status={status}
          error={state.error}
          loadingText="Cargando cuentas…"
          emptyText="No hay cuentas que coincidan con la búsqueda."
          onRetry={actions.reload}
        />
        {(status === "ready" || (status === "loading" && items.length > 0)) && (
          <DataTable
            caption="Cuentas del personal"
            columns={columns}
            rows={items}
            rowKey={(account) => account.id}
          />
        )}
        {meta && status !== "error" && (
          <PaginationBar
            page={meta.current_page}
            lastPage={meta.last_page}
            total={meta.total}
            busy={status === "loading"}
            onPageChange={(page) => actions.changeQuery({ page })}
          />
        )}
      </Card>

      <Dialog
        open={formDialog !== null}
        title={
          formDialog?.kind === "edit"
            ? "Editar usuario"
            : formDialog?.kind === "create"
              ? "Crear usuario"
              : "Formulario de usuario"
        }
        onClose={actions.closeDialog}
        className="form-dialog"
      >
        {formDialog && (
          <StaffForm
            key={formDialog.kind === "edit" ? `edit-${formDialog.account.id}` : "create"}
            account={formDialog.kind === "edit" ? formDialog.account : null}
            options={options}
            errors={state.fieldErrors}
            error={state.actionError}
            busy={state.saving}
            onCancel={actions.closeDialog}
            onSubmit={(values) =>
              formDialog.kind === "edit"
                ? actions.update(formDialog.account, values)
                : actions.create(values)
            }
          />
        )}
      </Dialog>

      <ConfirmDialog
        copy={confirmation}
        idleTitle="Confirmar acción sobre la cuenta"
        busy={state.saving}
        error={state.actionError}
        onConfirm={confirm}
        onCancel={cancelConfirmation}
      >
        {dialog?.kind === "password" && (
          <>
            <Field
              id="staff-new-password"
              label="Nueva contraseña"
              type={passwordVisible ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              {...fieldErrorProps("staff-new-password", state.fieldErrors, "password")}
            />
            <FieldErrors id="staff-new-password" errors={state.fieldErrors} name="password" />
            <Button
              className="password-visibility-toggle"
              type="button"
              variant="ghost"
              aria-controls="staff-new-password"
              aria-pressed={passwordVisible}
              aria-label={passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setPasswordVisible((visible) => !visible)}
            >
              {passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
            </Button>
          </>
        )}
      </ConfirmDialog>
    </>
  );
}
