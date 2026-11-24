import type { StaffOptionsDto } from "./admin-types";

/**
 * Regla área → rol (dashboard-020, revisión 2026-11-21 (b)). Funciones puras:
 * la vista no calcula nada. La API entrega `suggested_role` por área en
 * `GET admin/users/options`; aquí solo se decide cuándo aplicarlo.
 */

/** Texto de ayuda fijo junto a los campos Área y Rol (CA-40). */
export const AREA_ROLE_HELP =
  "El área es dónde trabaja la persona; el rol define qué puede hacer en el sistema.";

/** Rol que la API sugiere para el área elegida, si es asignable; `""` si no hay. */
export function suggestRole(options: StaffOptionsDto | null, departmentId: string): string {
  const department = options?.departments.find((item) => String(item.id) === departmentId);
  const suggested = department?.suggested_role ?? "";

  return options?.roles.some((role) => role.name === suggested) ? suggested : "";
}

/**
 * Valores que cambian al elegir un área. En el alta el rol se llena con el
 * sugerido salvo que el administrador ya lo haya elegido a mano
 * (`roleChosenManually`): esa elección no se pisa (CA-38, CA-39). Al editar una
 * cuenta existente el rol nunca cambia solo (solo se muestra el aviso, CA-41):
 * cambiarlo pide contraseña (api-021). Sin sugerencia, el rol actual se conserva.
 */
export function departmentSelectionChanges(input: {
  options: StaffOptionsDto | null;
  departmentId: string;
  currentRole: string;
  roleChosenManually: boolean;
  /** Edición de una cuenta existente. */
  editing?: boolean;
}): { department_id: string; role: string } {
  const role = input.editing || input.roleChosenManually
    ? input.currentRole
    : suggestRole(input.options, input.departmentId) || input.currentRole;

  return { department_id: input.departmentId, role };
}

/**
 * Aviso informativo (no bloquea) cuando el rol elegido no es el sugerido para
 * el área (CA-41). `null` sin área, sin rol elegido o sin sugerencia del área.
 */
export function roleSuggestionNotice(input: {
  options: StaffOptionsDto | null;
  departmentId: string;
  role: string;
}): string | null {
  const suggested = suggestRole(input.options, input.departmentId);

  if (suggested === "" || input.role === "" || input.role === suggested) return null;

  const department = input.options?.departments.find((item) => String(item.id) === input.departmentId);
  const label = input.options?.roles.find((role) => role.name === suggested)?.label ?? suggested;

  return `El rol sugerido para ${department?.name ?? "esta área"} es ${label}. Puedes asignar otro si la persona lo necesita.`;
}
