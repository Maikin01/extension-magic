// Server-only helpers for license generation. Never import from client code.
import { createHash, randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I

function randomBlock(size: number): string {
  const bytes = randomBytes(size);
  let out = "";
  for (let i = 0; i < size; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/**
 * Gera uma chave de licença no formato `LVBL-XXXX-XXXX-XXXX-XXXX`.
 */
export function generateLicenseKey(): string {
  return `LVBL-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}`;
}

/**
 * Hash SHA-256 usado para lookup no banco (nunca armazenamos a chave em claro
 * como identificador — a coluna `license_key` guarda o valor legível para o
 * dono da licença ver no dashboard).
 */
export function hashLicenseKey(key: string): string {
  return createHash("sha256").update(key.trim().toUpperCase()).digest("hex");
}

export function normalizeLicenseKey(input: string): string {
  return input.trim().toUpperCase();
}
