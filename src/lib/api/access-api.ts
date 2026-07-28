import { backendApi } from "@/lib/api/backend-client";

export type AppRole = "owner" | "admin" | "revendedor" | "cliente" | "user";

export type AccessContext = {
  user: {
    id: string;
    email: string | null;
  };
  roles: AppRole[];
};

export const accessApi = {
  getMyContext(): Promise<AccessContext> {
    return backendApi.invoke<AccessContext>("getMyAccessContext");
  },
};
