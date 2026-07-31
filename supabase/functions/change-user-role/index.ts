// change-user-role Edge Function
//
// Switches a user's role: inserts the new role-specific row, deletes the old
// one, and updates profiles.role — all inside a single Postgres transaction
// via the `admin_change_user_role` RPC function, so a failure at any step
// (e.g. a dosen who still owns a kelas/project) rolls back cleanly instead of
// leaving the user in a half-migrated state.
//
// Does NOT touch auth.users: the login email keeps whatever it was before
// the role switch (same limitation update-user already has for nip/nim
// edits) — only database rows change.
//
// Validation lives in ./validation.ts; shared types live in ./types.ts.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

import type { FailureResponse, SuccessResponse, ValidatedInput } from "./types.ts";
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

/** Turns a Postgres/PostgREST error into an Indonesian, user-facing message. */
function describeRpcError(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    return "NIP/NIM sudah digunakan oleh pengguna lain.";
  }
  if (error.code === "23503") {
    return "Tidak dapat mengubah role: pengguna ini masih memiliki kelas, project, atau UMKM mitra yang terhubung. Pindahkan atau hapus data tersebut terlebih dahulu.";
  }
  return error.message;
}

function buildRpcArgs(input: ValidatedInput) {
  const base = {
    p_profile_id: input.id,
    p_new_role: input.newRole,
    p_nip: null as string | null,
    p_fakultas: null as string | null,
    p_nim: null as string | null,
    p_prodi: null as string | null,
    p_angkatan: null as number | null,
    p_nama_usaha: null as string | null,
    p_sektor_usaha: null as string | null,
    p_alamat: null as string | null,
    p_deskripsi_usaha: null as string | null,
  };

  switch (input.newRole) {
    case "dosen":
      return { ...base, p_nip: input.nip, p_fakultas: input.fakultas };
    case "mahasiswa":
      return { ...base, p_nim: input.nim, p_prodi: input.prodi, p_angkatan: input.angkatan };
    case "umkm":
      return {
        ...base,
        p_nama_usaha: input.nama_usaha,
        p_sektor_usaha: input.sektor_usaha,
        p_alamat: input.alamat,
        p_deskripsi_usaha: input.deskripsi_usaha,
      };
    case "admin":
      return base;
  }
}

Deno.serve(async (request: Request): Promise<Response> => {
  try {
    if (request.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return failureResponse("Method not allowed", 405);
    }

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

    const { error } = await supabase.rpc("admin_change_user_role", buildRpcArgs(input));
    if (error) {
      return failureResponse(describeRpcError(error), 400);
    }

    return successResponse("Role pengguna berhasil diubah.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan tidak terduga.";
    return failureResponse(message, 500);
  }
});
