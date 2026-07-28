// create-user Edge Function
//
// Creates an auth user + profile + role-specific record in a single call.
// Flow: validate -> resolve login email -> create auth user -> insert profile
//       -> insert role table -> (rollback auth user on any DB failure).
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
import { resolveLoginEmail, validatePayload } from "./validation.ts";

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

function successResponse(profileId: string, role: ValidatedInput["role"]): Response {
  const body: SuccessResponse = { success: true, profileId, role };
  return new Response(JSON.stringify(body), { status: 200, headers: jsonHeaders });
}

function failureResponse(message: string, status: number): Response {
  const body: FailureResponse = { success: false, message };
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

// --- Role-table insertion ---
//
// Each helper inserts the role-specific record linked to the profile.
// They throw on error so the caller can perform a single rollback path.

async function insertDosen(
  supabase: SupabaseClient,
  profileId: string,
  input: DosenInput
): Promise<void> {
  const { error } = await supabase.from("dosen").insert({
    profile_id: profileId,
    nip: input.nip,
    fakultas: input.fakultas,
  });
  if (error) throw new Error(error.message);
}

async function insertMahasiswa(
  supabase: SupabaseClient,
  profileId: string,
  input: MahasiswaInput
): Promise<void> {
  const { error } = await supabase.from("mahasiswa").insert({
    profile_id: profileId,
    nim: input.nim,
    prodi: input.prodi,
    angkatan: input.angkatan,
  });
  if (error) throw new Error(error.message);
}

async function insertUmkm(
  supabase: SupabaseClient,
  profileId: string,
  input: UmkmInput
): Promise<void> {
  const { error } = await supabase.from("umkm").insert({
    profile_id: profileId,
    nama_usaha: input.nama_usaha,
    sektor_usaha: input.sektor_usaha,
    alamat: input.alamat,
    deskripsi_usaha: input.deskripsi_usaha,
  });
  if (error) throw new Error(error.message);
}

/**
 * Insert the role-specific record. Admin has no extra table — its data
 * lives entirely in `profiles` — so this is a no-op for admins.
 */
async function insertRoleRecord(
  supabase: SupabaseClient,
  profileId: string,
  input: ValidatedInput
): Promise<void> {
  switch (input.role) {
    case "admin":
      return;
    case "dosen":
      return insertDosen(supabase, profileId, input);
    case "mahasiswa":
      return insertMahasiswa(supabase, profileId, input);
    case "umkm":
      return insertUmkm(supabase, profileId, input);
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

  if (!supabaseUrl || !serviceRoleKey) {
    return failureResponse("Server misconfiguration: missing Supabase credentials.", 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

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

  // --- Step 2: resolve login email per role ---
  const loginEmail = resolveLoginEmail(input);

  // --- Step 3: create the auth user ---
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: loginEmail,
    password: input.password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return failureResponse(
      authError?.message ?? "Gagal membuat akun autentikasi.",
      400
    );
  }

  const userId = authData.user.id;

  // --- Steps 4 & 5: insert profile + role record, with rollback on failure ---
  try {
    // Step 4: profile row (id references auth.users.id)
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      nama_lengkap: input.nama,
      email: loginEmail,
      role: input.role,
      is_active: true,
      created_at: new Date().toISOString(),
      created_by: null, // nullable for now
    });
    if (profileError) throw new Error(profileError.message);

    // Step 5: role-specific table
    await insertRoleRecord(supabase, userId, input);
  } catch (error) {
    // Rollback: remove the orphaned auth user so we don't leak accounts.
    await supabase.auth.admin.deleteUser(userId);
    const message = error instanceof Error ? error.message : "Gagal menyimpan data pengguna.";
    return failureResponse(message, 400);
  }

  // --- Success ---
  return successResponse(userId, input.role);
});
