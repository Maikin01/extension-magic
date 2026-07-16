import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import riseLogo from "@/assets/rise-logo.jpg.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

export function SiteHeader() {
  const [session, setSession] = useState<{ email?: string | null } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const verifyUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error || !data.user) {
        setSession(null);
        setIsAdmin(false);
        return;
      }
      setSession({ email: data.user.email });
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      if (cancelled) return;
      setIsAdmin(!!roles?.some((r) => r.role === "admin" || r.role === "owner"));
    };
    verifyUser();
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_OUT" || !s) {
        setSession(null);
        setIsAdmin(false);
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        verifyUser();
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/", replace: true });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5 font-semibold">
          <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-[0_0_24px_oklch(0.63_0.245_25/0.55)]">
            <img src={riseLogo.url} alt="Rise Lovable" className="h-full w-full object-cover" />
          </span>
          <span className="font-display text-base tracking-tight">
            RISE <span className="text-gradient-red">LOVABLE</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 md:gap-2">
          <a
            href="/#plans"
            className="rounded-md px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            Planos
          </a>
          {session ? (
            <>
              <Link
                to="/dashboard"
                className="rounded-md px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                Painel
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  Admin
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-white/70 hover:bg-white/5 hover:text-white"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </>
          ) : (
            <Link
              to="/auth"
              className="btn-neon inline-flex h-9 items-center justify-center rounded-full px-5 text-sm font-bold text-white"
            >
              Quero Acesso
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
