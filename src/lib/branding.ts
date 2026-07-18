import { useEffect, useState } from "react";
import riseLogo from "@/assets/rise-logo.jpg.asset.json";
import apiceLogo from "@/assets/apice-lovable-logo.png.asset.json";

export type Branding = {
  code: string | null;
  name: string;
  displayFirst: string;
  displaySecond: string;
  logoUrl: string;
  logoAlt: string;
};

const REFERRAL_KEY = "rise_lovable_referral_code";
const RESELLER_BRAND_PATHS: Record<string, string> = {
  "/apice": "UV78ZDXT",
};

const DEFAULT_BRAND: Branding = {
  code: null,
  name: "Rise Lovable",
  displayFirst: "RISE",
  displaySecond: "LOVABLE",
  logoUrl: riseLogo.url,
  logoAlt: "Rise Lovable",
};

const RESELLER_BRANDS: Record<string, Branding> = {
  UV78ZDXT: {
    code: "UV78ZDXT",
    name: "Apice Lovable",
    displayFirst: "APICE",
    displaySecond: "LOVABLE",
    logoUrl: apiceLogo.url,
    logoAlt: "Apice Lovable",
  },
};

export function getBrandingFor(code: string | null | undefined): Branding {
  if (!code) return DEFAULT_BRAND;
  return RESELLER_BRANDS[code.toUpperCase()] ?? DEFAULT_BRAND;
}

export function readBrandingSync(): Branding {
  if (typeof window === "undefined") return DEFAULT_BRAND;
  try {
    const url = new URL(window.location.href);
    const pathCode = RESELLER_BRAND_PATHS[url.pathname.replace(/\/$/, "") || "/"];
    if (pathCode) return getBrandingFor(pathCode);

    const refFromUrl = url.searchParams.get("ref");
    if (refFromUrl) {
      const b = getBrandingFor(refFromUrl);
      if (b.code) return b;
    }

    // O domínio oficial puro sempre deve mostrar a marca principal. O referral
    // salvo continua existindo para comissão/checkout, mas não força white-label.
    return DEFAULT_BRAND;
  } catch {
    return DEFAULT_BRAND;
  }
}

export function useBranding(): Branding {
  const [brand, setBrand] = useState<Branding>(DEFAULT_BRAND);
  useEffect(() => {
    setBrand(readBrandingSync());
    const onStorage = (e: StorageEvent) => {
      if (e.key === REFERRAL_KEY) setBrand(readBrandingSync());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return brand;
}
