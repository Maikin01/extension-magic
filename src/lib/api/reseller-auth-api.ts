import { backendApi } from "@/lib/api/backend-client";

export type ResellerSignupStatus = {
  eligible: boolean;
  account_exists: boolean;
  already_claimed: boolean;
};

export const resellerAuthApi = {
  getSignupStatus(email: string) {
    return backendApi.public<ResellerSignupStatus>("getResellerSignupStatus", {
      email,
    });
  },

  register(input: { email: string; password: string; full_name?: string }) {
    return backendApi.public<{ ok: true }>("registerReseller", input);
  },

  claimAccess() {
    return backendApi.invoke<{ ok: true; roles: string[] }>("claimResellerAccess");
  },
};
