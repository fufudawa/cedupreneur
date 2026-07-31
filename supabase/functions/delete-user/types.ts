// Shared types for the delete-user Edge Function.
// Mirrors supabase/functions/create-user/types.ts and
// supabase/functions/update-user/types.ts so all three functions stay
// structurally consistent.

export type Role = "admin" | "dosen" | "mahasiswa" | "umkm";

/**
 * Raw JSON body as received from the client. Every field is optional here
 * because validation is what narrows the payload into a validated shape.
 */
export interface DeleteUserPayload {
  id?: unknown;
  role?: unknown;
}

/** Normalized, validated input. */
export interface ValidatedInput {
  id: string;
  role: Role;
}

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
