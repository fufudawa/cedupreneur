// Shared types for the create-user Edge Function.
// These describe the incoming request payload and the normalized,
// role-specific shapes produced after validation.

export type Role = "admin" | "dosen" | "mahasiswa" | "umkm";

/**
 * Raw JSON body as received from the client. Every field is optional here
 * because validation is what narrows the payload into a role-specific shape.
 */
export interface CreateUserPayload {
  role?: unknown;
  nama?: unknown;
  password?: unknown;
  email?: unknown;
  nip?: unknown;
  nim?: unknown;
  fakultas?: unknown;
  jabatan?: unknown;
  mata_kuliah?: unknown;
  prodi?: unknown;
  angkatan?: unknown;
  nama_usaha?: unknown;
  sektor_usaha?: unknown;
  alamat?: unknown;
  deskripsi_usaha?: unknown;
  kontak?: unknown;
}

/** Fields common to every role after validation. */
interface BaseInput {
  nama: string;
  password: string;
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
  profileId: string;
  role: Role;
}

/** Failure JSON response body. */
export interface FailureResponse {
  success: false;
  message: string;
}
