import { useState, type FormEvent } from "react";
import { Alert, Badge, Button, Card, Field, SelectField } from "@arca/ui";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { fieldErrorProps } from "@/components/FieldErrors";
import { FormField } from "@/components/FormField";
import { FormPanel } from "@/components/FormPanel";
import { triggerKey, useInlineFocus } from "@/components/inline-focus";
import { InlineConfirm } from "@/components/InlineConfirm";
import { InlineFormFooter } from "@/components/InlineFormFooter";
import { InlinePasswordReset } from "@/components/InlinePasswordReset";
import { ListStatusMessage } from "@/components/ListStatusMessage";
import { NoticeBar } from "@/components/NoticeBar";
import { PasswordVisibilityToggle } from "@/components/PasswordVisibilityToggle";
import { PaginationBar } from "@/components/PaginationBar";
import { SectionHeading } from "@/components/SectionHeading";
import type { StaffAccountDto } from "@/viewmodels/admin-types";
import type { PendingActionType } from "@/viewmodels/inline-list";
import { formatDateTime } from "@/viewmodels/formatters";
import {
  getStaffConfirmation,
  parseStatusFilter,
  type StaffAccountsViewModel,
  type StaffFormValues,
} from "@/viewmodels/staff-accounts";

export function UsersView({ state, actions }: StaffAccountsViewModel) {
  const { query, options, meta, items, status, form, editing, fieldErrors: errors, pendingAction } = state;
  const [searchText, setSearchText] = useState(query.search);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const editingNow = editing !== null;
  const { registerTrigger, noticeRef } = useInlineFocus({
    pendingAction,
    notice: state.notice,
    editing,
    firstFieldId: "staff-first_name",
  });
  const trigger = (account: StaffAccountDto, type: PendingActionType) =>
    registerTrigger(triggerKey({ type, id: account.id }));
  const set = (field: keyof StaffFormValues, value: string) =>
    actions.changeForm({ [field]: value });
  const field = (name: keyof StaffFormValues) => ({
    id: `staff-${name}`,
    ...fieldErrorProps(`staff-${name}`, errors, name),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    actions.submit();
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
            onClick={() => actions.startEdit(account)}
          >
            Editar
          </Button>
          <Button
            variant="secondary"
            aria-label={`${account.is_active ? "Desactivar" : "Activar"} cuenta de ${account.full_name}`}
            ref={trigger(account, "status")}
            onClick={() => actions.openAction({ type: "status", id: account.id })}
          >
            {account.is_active ? "Desactivar" : "Activar"}
          </Button>
          <Button
            variant="secondary"
            aria-label={`Restablecer contraseña de ${account.full_name}`}
            ref={trigger(account, "reset-password")}
            onClick={() => actions.openAction({ type: "reset-password", id: account.id })}
          >
            Contraseña
          </Button>
          <Button
            variant="secondary"
            aria-label={`Restablecer 2FA de ${account.full_name}`}
            ref={trigger(account, "reset-two-factor")}
            onClick={() => actions.openAction({ type: "reset-two-factor", id: account.id })}
          >
            2FA
          </Button>
          <Button
            variant="danger"
            aria-label={`Eliminar cuenta de ${account.full_name}`}
            ref={trigger(account, "delete")}
            onClick={() => actions.openAction({ type: "delete", id: account.id })}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  // Confirmación en línea bajo la fila a ancho completo (CA-08 a CA-12, CA-18).
  const rowDetail = (account: StaffAccountDto) => {
    if (pendingAction?.id !== account.id) return null;

    const copy = getStaffConfirmation(pendingAction.type, account);

    return pendingAction.type === "reset-password" ? (
      <InlinePasswordReset
        idPrefix={`staff-${account.id}`}
        copy={copy}
        busy={state.actionBusy}
        error={state.actionError}
        errors={state.actionFieldErrors}
        onConfirm={actions.confirmAction}
        onCancel={actions.closeAction}
      />
    ) : (
      <InlineConfirm
        copy={copy}
        busy={state.actionBusy}
        error={state.actionError}
        onConfirm={() => actions.confirmAction("")}
        onCancel={actions.closeAction}
      />
    );
  };

  return (
    <>
      <SectionHeading
        eyebrow="Administración"
        title="Usuarios"
        description="Gestiona las cuentas del personal del zoológico."
      />
      <NoticeBar message={state.notice} onDismiss={actions.dismissNotice} focusRef={noticeRef} />
      {state.actionError && pendingAction === null && (
        <Alert className="inline-alert" role="alert" aria-live="assertive">
          {state.actionError}
        </Alert>
      )}
      {state.optionsError && (
        <Alert className="inline-alert" role="alert" aria-live="assertive">
          {state.optionsError}
        </Alert>
      )}

      <FormPanel
        id="staff-form"
        title={editingNow ? `Editar usuario: ${editing.full_name}` : "Nuevo usuario"}
        description="Nombre, correo institucional, área y rol de la cuenta."
        expanded={state.formExpanded}
        onToggle={actions.toggleForm}
      >
        <form className="form-grid form-grid--events inline-form" onSubmit={submit}>
          <FormField id="staff-first_name" name="first_name" errors={errors}>
            <Field
              {...field("first_name")}
              label="Nombre"
              autoComplete="off"
              required
              value={form.first_name}
              onChange={(event) => set("first_name", event.target.value)}
            />
          </FormField>
          <FormField id="staff-last_name" name="last_name" errors={errors}>
            <Field
              {...field("last_name")}
              label="Apellido paterno"
              autoComplete="off"
              required
              value={form.last_name}
              onChange={(event) => set("last_name", event.target.value)}
            />
          </FormField>
          <FormField id="staff-second_last_name" name="second_last_name" errors={errors}>
            <Field
              {...field("second_last_name")}
              label="Apellido materno"
              autoComplete="off"
              value={form.second_last_name}
              onChange={(event) => set("second_last_name", event.target.value)}
            />
          </FormField>
          <FormField id="staff-email" name="email" errors={errors}>
            <Field
              {...field("email")}
              label="Correo institucional"
              type="email"
              autoComplete="off"
              required
              readOnly={editingNow}
              hint={editingNow ? "El correo no se puede modificar." : undefined}
              value={form.email}
              onChange={(event) => set("email", event.target.value)}
            />
          </FormField>
          <FormField id="staff-department_id" name="department_id" errors={errors}>
            <SelectField
              {...field("department_id")}
              label="Área"
              required
              value={form.department_id}
              onChange={(event) => actions.changeDepartment(event.target.value)}
            >
              <option value="">Selecciona un área</option>
              {options?.departments.map((department) => (
                <option value={String(department.id)} key={department.id}>
                  {department.name}
                </option>
              ))}
            </SelectField>
          </FormField>
          <FormField id="staff-role" name="role" errors={errors}>
            <SelectField
              {...field("role")}
              label="Rol"
              required
              value={form.role}
              onChange={(event) => set("role", event.target.value)}
            >
              <option value="">Selecciona un rol</option>
              {options?.roles.map((role) => (
                <option value={role.name} key={role.name}>
                  {role.label}
                </option>
              ))}
            </SelectField>
          </FormField>
          {!editingNow && (
            <FormField id="staff-password" name="password" errors={errors} span="half">
              <Field
                {...field("password")}
                label="Contraseña inicial"
                type={passwordVisible ? "text" : "password"}
                autoComplete="new-password"
                required
                value={form.password}
                onChange={(event) => set("password", event.target.value)}
              />
              <PasswordVisibilityToggle
                controls="staff-password"
                visible={passwordVisible}
                onToggle={() => setPasswordVisible((visible) => !visible)}
              />
            </FormField>
          )}
          <InlineFormFooter
            error={state.formError}
            busy={state.saving}
            editing={editingNow}
            submitLabel={editingNow ? "Guardar cambios" : "Crear usuario"}
            onCancelEdit={actions.cancelEdit}
          />
        </form>
      </FormPanel>

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
            rowDetail={rowDetail}
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
    </>
  );
}
