// Validation logic for the update-user Edge Function.
// This module is intentionally free of any Supabase / database concerns:
// it only turns an untrusted JSON payload into a strongly-typed,
// role-specific input (or an error message).

import type {
  Role,
  UpdateUserPayload,
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

/** Parse an optional boolean field: absent is valid (means "leave unchanged"). */
function parseOptionalBoolean(
  value: unknown
): { ok: true; value: boolean | undefined } | { ok: false } {
  if (value === undefined) return { ok: true, value: undefined };
  if (typeof value === "boolean") return { ok: true, value };
  return { ok: false };
}

/**
 * Ensure every listed field is a non-empty string.
 * Returns the name of the first missing field, or null when all present.
 */
function firstMissingField(
  payload: UpdateUserPayload,
  fields: readonly (keyof UpdateUserPayload)[]
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
export function validatePayload(payload: UpdateUserPayload): ValidationResult {
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

  // --- Fields required for every role ---
  const missingCommon = firstMissingField(payload, ["nama"]);
  if (missingCommon) {
    return { ok: false, message: `Field '${missingCommon}' wajib diisi.` };
  }
  const nama = (payload.nama as string).trim();

  // --- Optional is_active flag ---
  const activeResult = parseOptionalBoolean(payload.is_active);
  if (!activeResult.ok) {
    return { ok: false, message: "Field 'is_active' harus bertipe boolean." };
  }
  const isActive = activeResult.value;

  // --- Role-specific required fields & normalization ---
  switch (role) {
    case "admin": {
      const missing = firstMissingField(payload, ["email"]);
      if (missing) {
        return { ok: false, message: `Field '${missing}' wajib diisi.` };
      }
      const input: ValidatedInput = {
        role,
        id,
        nama,
        isActive,
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
        id,
        nama,
        isActive,
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
        id,
        nama,
        isActive,
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
        id,
        nama,
        isActive,
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
