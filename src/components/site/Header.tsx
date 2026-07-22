import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useBranding } from "@/lib/branding";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Home, Sparkles, CreditCard, LayoutGrid } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

export function SiteHeader() {
  const [session, setSession] = useState<{ email?: string | null } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isReseller, setIsReseller] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("home");
  const queryClient = useQueryClient();
  const router = useRouter();
  const brand = useBranding();

  useEffect(() => {
    let cancelled = false;
    const verifyUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error || !data.user) {
        setSession(null);
        setIsAdmin(false);
        setIsReseller(false);
        return;
      }
      setSession({ email: data.user.email });
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      if (cancelled) return;
      const roleSet = new Set((roles ?? []).map((r) => r.role));
      setIsAdmin(roleSet.has("admin") || roleSet.has("owner"));
      setIsReseller(roleSet.has("revendedor"));
    };
    verifyUser();
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_OUT" || !s) {
        setSession(null);
        setIsAdmin(false);
        setIsReseller(false);
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

  // Detecta seção ativa via scroll
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ids = ["como-funciona", "recursos", "plans"];
    const onScroll = () => {
      const y = window.scrollY + 120;
      let current = "home";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= y) current = id;
      }
      setActiveSection(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/", replace: true });
  };

  const goHome = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.location.pathname !== "/") {
      router.navigate({ to: "/" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-white/[0.03] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-semibold">
          <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-[0_0_24px_oklch(0.63_0.245_25/0.55)]">
            <img src={brand.logoUrl} alt={brand.logoAlt} className="h-full w-full object-cover" />
          </span>
          <span className="font-display text-base tracking-tight">
            {brand.displayFirst} <span className="text-gradient-red">{brand.displaySecond}</span>
          </span>
        </Link>

        {/* Nav pill vidro (centro) */}
        <div className="flex justify-center">
          <nav className="nav-glass hidden md:inline-flex" aria-label="Seções do site">
            <a href="/" onClick={goHome} className="nav-pill" data-active={activeSection === "home"}>
              <Home /> Início
            </a>
            <a href="/#como-funciona" className="nav-pill" data-active={activeSection === "como-funciona"}>
              <LayoutGrid /> Como funciona
            </a>
            <a href="/#recursos" className="nav-pill" data-active={activeSection === "recursos"}>
              <Sparkles /> Recursos
            </a>
            <a href="/#plans" className="nav-pill" data-active={activeSection === "plans"}>
              <CreditCard /> Planos
            </a>
          </nav>
        </div>

        {/* Ações à direita */}
        <div className="flex items-center gap-1 md:gap-2">
          {session ? (
            <>
              <Link
                to="/dashboard"
                className="rounded-md px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                Painel
              </Link>
              {isReseller && (
                <Link
                  to="/reseller"
                  className="rounded-md px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                >
                  Revendedor
                </Link>
              )}
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
        </div>
      </div>
    </header>
  );
}
