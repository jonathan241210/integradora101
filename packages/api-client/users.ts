import type { HttpClient } from "./http";
import type {
  CreateStaffUserInput,
  StaffUser,
  StaffUserCatalog,
  UpdateStaffUserInput,
} from "./types";

type DataResponse<T> = { data: T };

export function createUsersApi(http: HttpClient) {
  return {
    async list(): Promise<StaffUser[]> {
      const response = await http.get<DataResponse<StaffUser[]>>(
        "/api/v1/staff-users",
      );

      return response.data;
    },

    async catalog(): Promise<StaffUserCatalog> {
      const response = await http.get<DataResponse<StaffUserCatalog>>(
        "/api/v1/staff-users/catalog",
      );

      return response.data;
    },

    async create(input: CreateStaffUserInput): Promise<StaffUser> {
      const response = await http.post<DataResponse<StaffUser>>(
        "/api/v1/staff-users",
        input,
      );

      return response.data;
    },

    async update(
      id: number | string,
      input: UpdateStaffUserInput,
    ): Promise<StaffUser> {
      const response = await http.request<DataResponse<StaffUser>>(
        `/api/v1/staff-users/${encodeURIComponent(String(id))}`,
        { method: "PATCH", body: input },
      );

      return response.data;
    },

    deactivate(id: number | string): Promise<void> {
      return http.request<void>(
        `/api/v1/staff-users/${encodeURIComponent(String(id))}`,
        { method: "DELETE" },
      );
    },
  };
}

export type UsersApi = ReturnType<typeof createUsersApi>;
