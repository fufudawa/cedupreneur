// Validation logic for the delete-user Edge Function.
// This module is intentionally free of any Supabase / database concerns:
// it only turns an untrusted JSON payload into a strongly-typed,
// validated input (or an error message).

import type { DeleteUserPayload, Role, ValidationResult } from "./types.ts";

const ROLES: readonly Role[] = ["admin", "dosen", "mahasiswa", "umkm"];

/** Type guard: is this a non-empty, trimmed string? */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validate a raw payload and normalize it into a ValidatedInput.
 * Never throws — always returns a ValidationResult.
 */
export function validatePayload(payload: DeleteUserPayload): ValidationResult {
  // --- Target profile id must be present ---
  if (!isNonEmptyString(payload.id)) {
    return { ok: false, message: "Field 'id' wajib diisi." };
  }
  const id = (payload.id as string).trim();

  // --- Role must be present and one of the known roles ---
  if (!isNonEmptyString(payload.role) || !ROLES.includes(payload.role as Role)) {
    return { ok: false, message: "Field 'role' tidak valid atau tidak diisi." };
  }
  const role = payload.role as Role;

  return { ok: true, input: { id, role } };
}
