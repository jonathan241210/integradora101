import { useCallback, useEffect, useState } from "react";
import type {
  CreateStaffUserInput,
  StaffUser,
  StaffUserCatalog,
  UsersApi,
  UpdateStaffUserInput,
} from "@arca/api-client";

type UserError = {
  status?: number;
  message?: string;
  errors?: Record<string, string[]>;
};

export type UsersViewModelState = {
  status: "idle" | "loading" | "ready" | "error";
  users: StaffUser[];
  catalog: StaffUserCatalog | null;
  error: string;
  notice: string;
  fieldErrors: Record<string, string[]>;
  submitting: boolean;
  deactivatingId: string | null;
};

const initialState: UsersViewModelState = {
  status: "idle",
  users: [],
  catalog: null,
  error: "",
  notice: "",
  fieldErrors: {},
  submitting: false,
  deactivatingId: null,
};

export function getUsersErrorMessage(error: unknown): string {
  const apiError = (
    typeof error === "object" && error !== null ? error : {}
  ) as UserError;
  if (apiError.status === 401) return "";
  if (apiError.status === 422) return "Revisa los datos e inténtalo de nuevo.";
  if (apiError.status === 403) {
    return apiError.message || "No tienes permiso para realizar esta acción.";
  }
  if (apiError.status === 429) {
    return apiError.message || "Hay demasiadas solicitudes. Inténtalo más tarde.";
  }

  return apiError.message || "No fue posible completar la operación. Inténtalo de nuevo.";
}

export function useUsers(api: UsersApi, enabled: boolean) {
  const [state, setState] = useState(initialState);

  const load = useCallback(async () => {
    setState((current) => ({
      ...current,
      status: "loading",
      error: "",
      fieldErrors: {},
    }));

    try {
      const [users, catalog] = await Promise.all([api.list(), api.catalog()]);
      setState((current) => ({
        ...current,
        status: "ready",
        users,
        catalog,
        error: "",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        status: "error",
        error: getUsersErrorMessage(error),
      }));
    }
  }, [api]);

  useEffect(() => {
    if (enabled) {
      void load();
    } else {
      setState(initialState);
    }
  }, [enabled, load]);

  const save = useCallback(
    async (
      input: CreateStaffUserInput | UpdateStaffUserInput,
      id?: number | string,
    ): Promise<boolean> => {
      setState((current) => ({
        ...current,
        submitting: true,
        error: "",
        fieldErrors: {},
        notice: "",
      }));

      try {
        if (id === undefined) {
          await api.create(input as CreateStaffUserInput);
          setState((current) => ({ ...current, notice: "La cuenta se creó correctamente." }));
        } else {
          await api.update(id, input as UpdateStaffUserInput);
          setState((current) => ({ ...current, notice: "Los cambios se guardaron correctamente." }));
        }

        await load();
        return true;
      } catch (error) {
        const apiError = error as UserError;
        setState((current) => ({
          ...current,
          error: getUsersErrorMessage(error),
          fieldErrors: apiError.errors ?? {},
        }));
        return false;
      } finally {
        setState((current) => ({ ...current, submitting: false }));
      }
    },
    [api, load],
  );

  const deactivate = useCallback(
    async (user: StaffUser): Promise<boolean> => {
      const id = String(user.id);
      setState((current) => ({
        ...current,
        deactivatingId: id,
        error: "",
        notice: "",
      }));

      try {
        await api.deactivate(user.id);
        setState((current) => ({
          ...current,
          notice: "La cuenta se desactivó correctamente.",
        }));
        await load();
        return true;
      } catch (error) {
        setState((current) => ({ ...current, error: getUsersErrorMessage(error) }));
        return false;
      } finally {
        setState((current) => ({ ...current, deactivatingId: null }));
      }
    },
    [api, load],
  );

  const clearNotice = useCallback(() => {
    setState((current) => ({ ...current, notice: "" }));
  }, []);

  return { state, retry: load, save, deactivate, clearNotice };
}
