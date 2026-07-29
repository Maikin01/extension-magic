import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useBranding } from "@/lib/branding";

export function ResellerAuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const brand = useBranding();
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(55% 45% at 50% 0%, oklch(0.63 0.245 25 / 0.22), transparent 68%)",
        }}
      />
      <div className="auth-shell relative z-10 w-full max-w-md">
        <Link to="/" className="mb-7 flex items-center justify-center gap-3">
          <img
            src={brand.logoUrl}
            alt={brand.logoAlt}
            className="h-11 w-11 rounded-xl object-cover"
          />
          <span className="auth-wordmark font-display text-xl tracking-tight">
            RISE <span className="text-gradient-red">LOVABLE</span>
          </span>
        </Link>

        <section className="auth-card p-6 sm:p-8">
          <span className="auth-led auth-led-top" />
          <span className="auth-led auth-led-bottom" />
          <div className="relative z-[2]">
            <div className="mb-6 text-center">
              <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
