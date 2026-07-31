// Shared types for the change-user-role Edge Function.

export type Role = "admin" | "dosen" | "mahasiswa" | "umkm";

/** Raw JSON body as received from the client. */
export interface ChangeUserRolePayload {
  id?: unknown;
  newRole?: unknown;
  nip?: unknown;
  fakultas?: unknown;
  nim?: unknown;
  prodi?: unknown;
  angkatan?: unknown;
  nama_usaha?: unknown;
  sektor_usaha?: unknown;
  alamat?: unknown;
  deskripsi_usaha?: unknown;
}

interface BaseInput {
  id: string;
}

export interface AdminRoleInput extends BaseInput {
  newRole: "admin";
}

export interface DosenRoleInput extends BaseInput {
  newRole: "dosen";
  nip: string;
  fakultas: string;
}

export interface MahasiswaRoleInput extends BaseInput {
  newRole: "mahasiswa";
  nim: string;
  prodi: string;
  angkatan: number;
}

export interface UmkmRoleInput extends BaseInput {
  newRole: "umkm";
  nama_usaha: string;
  sektor_usaha: string;
  alamat: string;
  deskripsi_usaha: string;
}

/** Discriminated union of all valid, normalized inputs. */
export type ValidatedInput = AdminRoleInput | DosenRoleInput | MahasiswaRoleInput | UmkmRoleInput;

/** Result of running validation over a raw payload. */
export type ValidationResult = { ok: true; input: ValidatedInput } | { ok: false; message: string };

export interface SuccessResponse {
  success: true;
  message: string;
}

export interface FailureResponse {
  success: false;
  message: string;
}
