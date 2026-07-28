import { Link } from "@tanstack/react-router";
import { useBranding } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";

export function SiteHeader() {
  const { session, isAdmin, isReseller, signOut } = useAuth();
  const brand = useBranding();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-white/[0.03] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5 font-semibold">
          <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-[0_0_24px_oklch(0.63_0.245_25/0.55)]">
            <img src={brand.logoUrl} alt={brand.logoAlt} className="h-full w-full object-cover" />
          </span>
          <span className="font-display text-base tracking-tight">
            {brand.displayFirst} <span className="text-gradient-red">{brand.displaySecond}</span>
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
              LOGIN
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
