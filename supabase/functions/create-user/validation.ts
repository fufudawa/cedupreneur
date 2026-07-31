// Validation logic for the create-user Edge Function.
// This module is intentionally free of any Supabase / database concerns:
// it only turns an untrusted JSON payload into a strongly-typed,
// role-specific input (or an error message).

import type {
  CreateUserPayload,
  Role,
  ValidatedInput,
  ValidationResult,
} from "./types.ts";

const ROLES: readonly Role[] = ["admin", "dosen", "mahasiswa", "umkm"];

/** Type guard: is this a non-empty, trimmed string? */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Parse an angkatan (year) that may arrive as a number or numeric string. */
function parseAngkatan(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string" && /^\d{4}$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  return null;
}

/** Parse an optional string field — returns null (not required) if absent/blank. */
function parseOptionalString(value: unknown): string | null {
  return isNonEmptyString(value) ? value.trim() : null;
}

/** Parse an optional string array (e.g. mata kuliah checkboxes) — returns [] if absent/invalid. */
function parseOptionalStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

/**
 * Ensure every listed field is a non-empty string.
 * Returns the name of the first missing field, or null when all present.
 */
function firstMissingField(
  payload: CreateUserPayload,
  fields: readonly (keyof CreateUserPayload)[]
): string | null {
  for (const field of fields) {
    if (!isNonEmptyString(payload[field])) {
      return field;
    }
  }
  return null;
}

/**
 * Validate a raw payload and normalize it into a ValidatedInput.
 * Never throws — always returns a ValidationResult.
 */
export function validatePayload(payload: CreateUserPayload): ValidationResult {
  // --- Role must be present and one of the known roles ---
  if (!isNonEmptyString(payload.role) || !ROLES.includes(payload.role as Role)) {
    return { ok: false, message: "Field 'role' tidak valid atau tidak diisi." };
  }
  const role = payload.role as Role;

  // --- Fields required for every role ---
  const missingCommon = firstMissingField(payload, ["nama", "password"]);
  if (missingCommon) {
    return { ok: false, message: `Field '${missingCommon}' wajib diisi.` };
  }

  const nama = (payload.nama as string).trim();
  const password = payload.password as string;

  // --- Role-specific required fields & normalization ---
  switch (role) {
    case "admin": {
      const missing = firstMissingField(payload, ["email"]);
      if (missing) {
        return { ok: false, message: `Field '${missing}' wajib diisi.` };
      }
      const input: ValidatedInput = {
        role,
        nama,
        password,
        email: (payload.email as string).trim(),
      };
      return { ok: true, input };
    }

    case "dosen": {
      const missing = firstMissingField(payload, ["nip", "fakultas"]);
      if (missing) {
        return { ok: false, message: `Field '${missing}' wajib diisi.` };
      }
      const input: ValidatedInput = {
        role,
        nama,
        password,
        nip: (payload.nip as string).trim(),
        fakultas: (payload.fakultas as string).trim(),
        jabatan: parseOptionalString(payload.jabatan),
        mataKuliah: parseOptionalStringArray(payload.mata_kuliah),
      };
      return { ok: true, input };
    }

    case "mahasiswa": {
      const missing = firstMissingField(payload, ["nim", "prodi"]);
      if (missing) {
        return { ok: false, message: `Field '${missing}' wajib diisi.` };
      }
      const angkatan = parseAngkatan(payload.angkatan);
      if (angkatan === null) {
        return { ok: false, message: "Field 'angkatan' wajib diisi (tahun 4 digit)." };
      }
      const input: ValidatedInput = {
        role,
        nama,
        password,
        nim: (payload.nim as string).trim(),
        prodi: (payload.prodi as string).trim(),
        angkatan,
      };
      return { ok: true, input };
    }

    case "umkm": {
      const missing = firstMissingField(payload, [
        "email",
        "nama_usaha",
        "sektor_usaha",
        "alamat",
        "deskripsi_usaha",
      ]);
      if (missing) {
        return { ok: false, message: `Field '${missing}' wajib diisi.` };
      }
      const input: ValidatedInput = {
        role,
        nama,
        password,
        email: (payload.email as string).trim(),
        nama_usaha: (payload.nama_usaha as string).trim(),
        sektor_usaha: (payload.sektor_usaha as string).trim(),
        alamat: (payload.alamat as string).trim(),
        deskripsi_usaha: (payload.deskripsi_usaha as string).trim(),
        kontak: parseOptionalString(payload.kontak),
      };
      return { ok: true, input };
    }
  }
}

/**
 * Derive the login email for a validated input.
 * - admin / umkm: use the provided email.
 * - dosen:   {nip}@cle.local
 * - mahasiswa: {nim}@student.cle.local
 */
export function resolveLoginEmail(input: ValidatedInput): string {
  switch (input.role) {
    case "admin":
    case "umkm":
      return input.email;
    case "dosen":
      return `${input.nip}@cle.local`;
    case "mahasiswa":
      return `${input.nim}@student.cle.local`;
  }
}
