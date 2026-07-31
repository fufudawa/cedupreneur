// Validation logic for the change-user-role Edge Function.
// Mirrors create-user's validation style, but keyed on `newRole` (not `role`)
// and without password/nama — those never change here.

import type { ChangeUserRolePayload, Role, ValidationResult } from "./types.ts";

const ROLES: readonly Role[] = ["admin", "dosen", "mahasiswa", "umkm"];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseAngkatan(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string" && /^\d{4}$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  return null;
}

function firstMissingField(
  payload: ChangeUserRolePayload,
  fields: readonly (keyof ChangeUserRolePayload)[]
): string | null {
  for (const field of fields) {
    if (!isNonEmptyString(payload[field])) {
      return field;
    }
  }
  return null;
}

export function validatePayload(payload: ChangeUserRolePayload): ValidationResult {
  if (!isNonEmptyString(payload.id) || !UUID_REGEX.test(payload.id.trim())) {
    return { ok: false, message: "Field 'id' tidak valid atau tidak diisi." };
  }
  const id = payload.id.trim();

  if (!isNonEmptyString(payload.newRole) || !ROLES.includes(payload.newRole as Role)) {
    return { ok: false, message: "Field 'newRole' tidak valid atau tidak diisi." };
  }
  const newRole = payload.newRole as Role;

  switch (newRole) {
    case "admin":
      return { ok: true, input: { id, newRole } };

    case "dosen": {
      const missing = firstMissingField(payload, ["nip", "fakultas"]);
      if (missing) {
        return { ok: false, message: `Field '${missing}' wajib diisi.` };
      }
      return {
        ok: true,
        input: {
          id,
          newRole,
          nip: (payload.nip as string).trim(),
          fakultas: (payload.fakultas as string).trim(),
        },
      };
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
      return {
        ok: true,
        input: {
          id,
          newRole,
          nim: (payload.nim as string).trim(),
          prodi: (payload.prodi as string).trim(),
          angkatan,
        },
      };
    }

    case "umkm": {
      const missing = firstMissingField(payload, ["nama_usaha", "sektor_usaha", "alamat", "deskripsi_usaha"]);
      if (missing) {
        return { ok: false, message: `Field '${missing}' wajib diisi.` };
      }
      return {
        ok: true,
        input: {
          id,
          newRole,
          nama_usaha: (payload.nama_usaha as string).trim(),
          sektor_usaha: (payload.sektor_usaha as string).trim(),
          alamat: (payload.alamat as string).trim(),
          deskripsi_usaha: (payload.deskripsi_usaha as string).trim(),
        },
      };
    }
  }
}
