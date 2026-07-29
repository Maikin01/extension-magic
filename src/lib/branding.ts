import riseLogo from "@/assets/rise-owl-logo.png.asset.json";

export type Branding = {
  code: string | null;
  name: string;
  displayFirst: string;
  displaySecond: string;
  logoUrl: string;
  logoAlt: string;
};

const DEFAULT_BRAND: Branding = {
  code: null,
  name: "Rise Lovable",
  displayFirst: "RISE",
  displaySecond: "LOVABLE",
  logoUrl: "/logo.png",
  logoAlt: "Rise Lovable",
};

export function useBranding(): Branding {
  return DEFAULT_BRAND;
}
