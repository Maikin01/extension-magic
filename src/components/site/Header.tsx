import { Link } from "@tanstack/react-router";
import { useBranding } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";

type HeaderProps = {
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
};

export function SiteHeader({ theme, onToggleTheme }: HeaderProps) {
  const { session, isAdmin, isReseller, signOut } = useAuth();
  const brand = useBranding();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--rv-border,#22222a)] bg-[var(--rv-sidebar-bg,rgba(13,13,16,0.85))] backdrop-blur-xl backdrop-saturate-150 transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5 font-semibold">
          <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-red-600 to-red-800 shadow-md">
            <img src={brand.logoUrl} alt={brand.logoAlt} className="h-full w-full object-cover" />
          </span>
          <span className="font-display text-base tracking-tight text-[var(--rv-text-main,#ffffff)]">
            {brand.displayFirst} <span className="text-red-600 font-bold">{brand.displaySecond}</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <a
            href="/#plans"
            className="rounded-md px-3 py-2 text-sm font-medium text-[var(--rv-text-muted,#a1a1aa)] transition-colors hover:bg-red-600/10 hover:text-red-600"
          >
            Planos
          </a>

          {/* Prominent Navbar Theme Switcher Button */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-600/40 bg-red-600/10 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
              title="Alternar entre Tema Claro ☀️ e Escuro 🌙"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-slate-800" />
                  <span>Modo Escuro</span>
                </>
              )}
            </button>
          )}

          {session ? (
            <>
              <Link
                to="/dashboard"
                className="rounded-md px-3 py-2 text-sm font-medium text-[var(--rv-text-muted,#a1a1aa)] transition-colors hover:bg-white/5 hover:text-white"
              >
                Painel
              </Link>
              {isReseller && (
                <Link
                  to="/revenda"
                  className="rounded-md px-3 py-2 text-sm font-medium text-[var(--rv-text-muted,#a1a1aa)] transition-colors hover:bg-white/5 hover:text-white"
                >
                  Revendedor
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="rounded-md px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-600/10"
                >
                  Admin
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-[var(--rv-text-muted,#a1a1aa)] hover:bg-white/5 hover:text-white"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rv-btn-primary inline-flex h-9 items-center justify-center rounded-full px-5 text-sm font-bold text-white shadow-md"
            >
              LOGIN
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
