// Shared types for the update-user Edge Function.
// Mirrors supabase/functions/create-user/types.ts so both functions stay
// structurally consistent.

export type Role = "admin" | "dosen" | "mahasiswa" | "umkm";

/**
 * Raw JSON body as received from the client. Every field is optional here
 * because validation is what narrows the payload into a role-specific shape.
 */
export interface UpdateUserPayload {
  id?: unknown;
  role?: unknown;
  nama?: unknown;
  email?: unknown;
  nip?: unknown;
  fakultas?: unknown;
  jabatan?: unknown;
  mata_kuliah?: unknown;
  nim?: unknown;
  prodi?: unknown;
  angkatan?: unknown;
  nama_usaha?: unknown;
  sektor_usaha?: unknown;
  alamat?: unknown;
  deskripsi_usaha?: unknown;
  kontak?: unknown;
  is_active?: unknown;
}

/** Fields common to every role after validation. */
interface BaseInput {
  id: string;
  nama: string;
  /** Left undefined when the caller didn't send `is_active` — leaves the column untouched. */
  isActive?: boolean;
}

export interface AdminInput extends BaseInput {
  role: "admin";
  email: string;
}

export interface DosenInput extends BaseInput {
  role: "dosen";
  nip: string;
  fakultas: string;
  jabatan: string | null;
  mataKuliah: string[];
}

export interface MahasiswaInput extends BaseInput {
  role: "mahasiswa";
  nim: string;
  prodi: string;
  angkatan: number;
}

export interface UmkmInput extends BaseInput {
  role: "umkm";
  email: string;
  nama_usaha: string;
  sektor_usaha: string;
  alamat: string;
  deskripsi_usaha: string;
  kontak: string | null;
}

/** Discriminated union of all valid, normalized inputs. */
export type ValidatedInput = AdminInput | DosenInput | MahasiswaInput | UmkmInput;

/** Result of running validation over a raw payload. */
export type ValidationResult =
  | { ok: true; input: ValidatedInput }
  | { ok: false; message: string };

/** Successful JSON response body. */
export interface SuccessResponse {
  success: true;
  message: string;
}

/** Failure JSON response body. */
export interface FailureResponse {
  success: false;
  message: string;
}
