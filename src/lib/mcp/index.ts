import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPlans from "./tools/list-plans";
import listMyLicenses from "./tools/list-my-licenses";
import listMyPayments from "./tools/list-my-payments";
import getLicenseDevices from "./tools/get-license-devices";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "rise-lovable-mcp",
  title: "RISE LOVABLE",
  version: "0.1.0",
  instructions:
    "Ferramentas da RISE LOVABLE. Use list_plans para ver planos disponíveis, list_my_licenses para as licenças da conta conectada, list_my_payments para o histórico de pagamentos e get_license_devices para os dispositivos de uma licença.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listPlans, listMyLicenses, listMyPayments, getLicenseDevices],
});
