import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

const APICE_REFERRAL_CODE = "UV78ZDXT";
const REFERRAL_KEY = "rise_lovable_referral_code";

export const Route = createFileRoute("/apice")({
  head: () => ({
    meta: [
      { title: "Apice Lovable — Planos" },
      {
        name: "description",
        content: "Acesse os planos Apice Lovable com indicação do revendedor.",
      },
    ],
  }),
  component: ApiceRedirectPage,
});

function ApiceRedirectPage() {
  useEffect(() => {
    window.localStorage.setItem(REFERRAL_KEY, APICE_REFERRAL_CODE);
    window.location.replace(`/?ref=${APICE_REFERRAL_CODE}#plans`);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-foreground">
      <p className="text-sm text-muted-foreground">Abrindo Apice Lovable…</p>
    </div>
  );
}