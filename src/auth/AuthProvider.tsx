import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { accessApi, type AppRole } from "@/lib/api/access-api";
import { BackendApiError } from "@/lib/api/backend-client";

export type AuthStatus = "initializing" | "authenticated" | "unauthenticated" | "error";

type AuthState = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  error: Error | null;
};

type AuthContextValue = AuthState & {
  isAdmin: boolean;
  isOwner: boolean;
  isReseller: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const INITIAL_STATE: AuthState = {
  status: "initializing",
  session: null,
  user: null,
  roles: [],
  error: null,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);
  const generation = useRef(0);
  const queryClient = useQueryClient();
  const router = useRouter();

  const refresh = useCallback(async () => {
    const currentGeneration = ++generation.current;
    let session: Session | null = null;
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      session = data.session;

      if (!session) {
        if (currentGeneration === generation.current) {
          setState({
            status: "unauthenticated",
            session: null,
            user: null,
            roles: [],
            error: null,
          });
        }
        return;
      }

      const context = await accessApi.getMyContext();
      if (currentGeneration !== generation.current) return;
      setState({
        status: "authenticated",
        session,
        user: session.user,
        roles: context.roles,
        error: null,
      });
    } catch (error) {
      if (currentGeneration !== generation.current) return;
      const normalized = error instanceof Error ? error : new Error(String(error));
      if (error instanceof BackendApiError && error.status === 401) {
        await supabase.auth.signOut({ scope: "local" });
        setState({
          status: "unauthenticated",
          session: null,
          user: null,
          roles: [],
          error: null,
        });
        return;
      }

      // Uma falha de rede/5xx não é logout. Mantemos a sessão e expomos um
      // estado recuperável para a interface oferecer nova tentativa.
      setState((previous) => ({
        status: "error",
        session: session ?? previous.session,
        user: session?.user ?? previous.user,
        roles: session && previous.user?.id !== session.user.id ? [] : previous.roles,
        error: normalized,
      }));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        generation.current += 1;
        setState({
          status: "unauthenticated",
          session: null,
          user: null,
          roles: [],
          error: null,
        });
        queryClient.clear();
        void router.invalidate();
        return;
      }

      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        // Supabase recomenda não iniciar outra operação auth dentro do callback.
        window.setTimeout(() => {
          void refresh().then(() => {
            void router.invalidate();
            void queryClient.invalidateQueries();
          });
        }, 0);
      }
    });

    return () => data.subscription.unsubscribe();
  }, [queryClient, refresh, router]);

  const signOut = useCallback(async () => {
    generation.current += 1;
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    setState({
      status: "unauthenticated",
      session: null,
      user: null,
      roles: [],
      error: null,
    });
    await router.navigate({ to: "/", replace: true });
  }, [queryClient, router]);

  const value = useMemo<AuthContextValue>(() => {
    const roleSet = new Set(state.roles);
    return {
      ...state,
      isAdmin: roleSet.has("admin") || roleSet.has("owner"),
      isOwner: roleSet.has("owner"),
      isReseller: roleSet.has("revendedor"),
      refresh,
      signOut,
    };
  }, [refresh, signOut, state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return value;
}
