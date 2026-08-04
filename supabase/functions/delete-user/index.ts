// delete-user Edge Function
//
// Deletes a user entirely: role-specific table row -> profiles row -> auth user.
// Flow: validate -> delete role table -> delete profiles -> delete auth user.
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

// --- Role-table deletion ---
//
// Each helper deletes the role-specific record linked to the profile.
// They throw on error so the caller can surface a single failure response.

/**
 * `dosen` and `umkm` are protected by RESTRICT foreign keys (kelas.dosen_id /
 * project.created_by for dosen; project.umkm_id for umkm) — deleting one
 * while it still has kelas/project attached fails with a raw Postgres
 * "violates foreign key constraint" message. This turns that specific error
 * (code 23503) into guidance the admin can actually act on, instead of
 * leaking the constraint name to the UI.
 */
function friendlyDeleteError(role: ValidatedInput["role"], error: { code?: string; message: string }): string {
  if (error.code === "23503") {
    if (role === "dosen") {
      return "Dosen ini masih mengampu kelas dan/atau memiliki project aktif. Pindahkan kelasnya ke dosen lain atau hapus kelas/project tersebut dulu lewat Data Master, baru hapus akun ini.";
    }
    if (role === "umkm") {
      return "UMKM ini masih terhubung ke project aktif. Hapus atau pindahkan project tersebut dulu sebelum menghapus akun ini.";
    }
  }
  return error.message;
}

async function deleteRoleRecord(supabase: SupabaseClient, input: ValidatedInput): Promise<void> {
  switch (input.role) {
    case "admin":
      return;
    case "dosen": {
      const { error } = await supabase.from("dosen").delete().eq("profile_id", input.id);
      if (error) throw new Error(friendlyDeleteError(input.role, error));
      return;
    }
    case "mahasiswa": {
      const { error } = await supabase.from("mahasiswa").delete().eq("profile_id", input.id);
      if (error) throw new Error(error.message);
      return;
    }
    case "umkm": {
      const { error } = await supabase.from("umkm").delete().eq("profile_id", input.id);
      if (error) throw new Error(friendlyDeleteError(input.role, error));
      return;
    }
  }
}

async function deleteProfile(supabase: SupabaseClient, input: ValidatedInput): Promise<void> {
  const { error } = await supabase.from("profiles").delete().eq("id", input.id);
  if (error) throw new Error(error.message);
}

async function deleteAuthUser(supabase: SupabaseClient, input: ValidatedInput): Promise<void> {
  const { error } = await supabase.auth.admin.deleteUser(input.id);
  if (error) throw new Error(error.message);
}

// --- Main handler ---

Deno.serve(async (request: Request): Promise<Response> => {
  try {
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

    // --- Step 2: delete role-specific table row ---
    try {
      await deleteRoleRecord(supabase, input);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menghapus data role pengguna.";
      return failureResponse(message, 400);
    }

    // --- Step 3: delete profiles row ---
    try {
      await deleteProfile(supabase, input);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menghapus data profil pengguna.";
      return failureResponse(message, 400);
    }

    // --- Step 4: delete auth user ---
    try {
      await deleteAuthUser(supabase, input);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menghapus akun autentikasi pengguna.";
      return failureResponse(message, 400);
    }

    // --- Success ---
    return successResponse("Pengguna berhasil dihapus.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan tidak terduga.";
    return failureResponse(message, 500);
  }
});
