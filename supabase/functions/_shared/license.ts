import type { SupabaseClient } from "npm:@supabase/supabase-js@2.110.2";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomBlock(size: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  let out = "";
  for (let i = 0; i < size; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function generateLicenseKey(): string {
  return `LVBL-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}`;
}

export function normalizeLicenseKey(value: string): string {
  return value.trim().toUpperCase();
}

export async function hashLicenseKey(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalizeLicenseKey(value));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function insertUniqueLicense(
  admin: SupabaseClient,
  values: Record<string, unknown>,
): Promise<any> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const key = generateLicenseKey();
    const licenseKeyHash = await hashLicenseKey(key);
    const { data, error } = await admin
      .from("licenses")
      .insert({ ...values, license_key: key, license_key_hash: licenseKeyHash })
      .select()
      .single();
    if (!error && data) return data;
    if (error && !/duplicate|unique/i.test(error.message)) throw error;
  }
  throw new Error("Não foi possível gerar uma chave única. Tente novamente.");
}
