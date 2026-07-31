// update-user Edge Function
//
// Updates a profile + role-specific record for an existing user.
// Flow: validate -> update profiles -> update role table.
// Does NOT touch auth.users: no password changes, no auth email changes,
// no auth user creation/deletion. Only database rows are updated.
//
// Validation lives in ./validation.ts; shared types live in ./types.ts.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

import type {
  DosenInput,
  FailureResponse,
  MahasiswaInput,
  SuccessResponse,
  UmkmInput,
  ValidatedInput,
} from "./types.ts";
import { validatePayload } from "./validation.ts";

// --- Deno runtime typings (Edge Functions run on Deno) ---
type DenoRequestHandler = (request: Request) => Response | Promise<Response>;

declare const Deno: {
  serve: (handler: DenoRequestHandler) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

// --- Response helpers ---

function successResponse(message: string): Response {
  const body: SuccessResponse = { success: true, message };
  return new Response(JSON.stringify(body), { status: 200, headers: jsonHeaders });
}

function failureResponse(message: string, status: number): Response {
  const body: FailureResponse = { success: false, message };
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

/**
 * Verifies the caller is a logged-in admin before allowing this function to
 * proceed. `verify_jwt: true` on the function config only checks that the
 * request carries SOME valid Supabase session — any dosen/mahasiswa/umkm
 * could otherwise invoke this admin-only function directly. This checks the
 * caller's own profile role using the anon-key client bound to their JWT.
 */
async function requireAdmin(
  request: Request,
  supabaseUrl: string,
  anonKey: string,
  adminClient: SupabaseClient
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return { ok: false, response: failureResponse("Unauthorized.", 401) };
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) {
    return { ok: false, response: failureResponse("Unauthorized.", 401) };
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profileError || profile?.role !== "admin") {
    return { ok: false, response: failureResponse("Forbidden: hanya admin yang boleh mengakses fitur ini.", 403) };
  }

  return { ok: true };
}

// --- Profile update ---

async function updateProfile(supabase: SupabaseClient, input: ValidatedInput): Promise<void> {
  const updates: Record<string, unknown> = { nama_lengkap: input.nama };

  if (input.role === "admin" || input.role === "umkm") {
    updates.email = input.email;
  }

  if (input.isActive !== undefined) {
    updates.is_active = input.isActive;
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", input.id);
  if (error) throw new Error(error.message);
}

// --- Role-table update ---
//
// Each helper updates the role-specific record linked to the profile.
// They throw on error so the caller can surface a single failure response.

async function updateDosen(supabase: SupabaseClient, input: DosenInput): Promise<void> {
  const { error } = await supabase
    .from("dosen")
    .update({
      nip: input.nip,
      fakultas: input.fakultas,
      jabatan: input.jabatan,
      mata_kuliah_diampu: input.mataKuliah,
    })
    .eq("profile_id", input.id);
  if (error) throw new Error(error.message);
}

async function updateMahasiswa(supabase: SupabaseClient, input: MahasiswaInput): Promise<void> {
  const { error } = await supabase
    .from("mahasiswa")
    .update({ nim: input.nim, prodi: input.prodi, angkatan: input.angkatan })
    .eq("profile_id", input.id);
  if (error) throw new Error(error.message);
}

async function updateUmkm(supabase: SupabaseClient, input: UmkmInput): Promise<void> {
  const { error } = await supabase
    .from("umkm")
    .update({
      nama_usaha: input.nama_usaha,
      sektor_usaha: input.sektor_usaha,
      alamat: input.alamat,
      deskripsi_usaha: input.deskripsi_usaha,
      kontak: input.kontak,
    })
    .eq("profile_id", input.id);
  if (error) throw new Error(error.message);
}

/**
 * Update the role-specific record. Admin has no extra table — its data
 * lives entirely in `profiles` — so this is a no-op for admins.
 */
async function updateRoleRecord(supabase: SupabaseClient, input: ValidatedInput): Promise<void> {
  switch (input.role) {
    case "admin":
      return;
    case "dosen":
      return updateDosen(supabase, input);
    case "mahasiswa":
      return updateMahasiswa(supabase, input);
    case "umkm":
      return updateUmkm(supabase, input);
  }
}

// --- Main handler ---

Deno.serve(async (request: Request): Promise<Response> => {
  // Preflight
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return failureResponse("Method not allowed", 405);
  }

  // --- Environment / admin client ---
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return failureResponse("Server misconfiguration: missing Supabase credentials.", 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const adminCheck = await requireAdmin(request, supabaseUrl, anonKey, supabase);
  if (!adminCheck.ok) return adminCheck.response;

  // --- Step 1: parse + validate payload ---
  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return failureResponse("Body request bukan JSON yang valid.", 400);
  }

  const validation = validatePayload(rawPayload as Record<string, unknown>);
  if (!validation.ok) {
    return failureResponse(validation.message, 400);
  }
  const input = validation.input;

  // --- Steps 2 & 3: update profiles + role-specific table ---
  try {
    // Step 2: profiles row (nama_lengkap, email for admin/umkm, is_active)
    await updateProfile(supabase, input);

    // Step 3: role-specific table
    await updateRoleRecord(supabase, input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui data pengguna.";
    return failureResponse(message, 400);
  }

  // --- Step 4: success ---
  return successResponse("Pengguna berhasil diperbarui.");
});
