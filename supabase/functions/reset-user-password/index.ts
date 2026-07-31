// reset-user-password Edge Function
//
// Sets a new password (chosen by the admin, not auto-generated) as the
// user's real Supabase Auth password via the Admin API. Unlike the old
// frontend-only simulation, this actually works for login.
//
// Flow: validate `id` + `password` -> auth.admin.updateUserById.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

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

type SuccessResponse = { success: true; message: string };
type FailureResponse = { success: false; message: string };

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

const MIN_PASSWORD_LENGTH = 8;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

    const { id, password } = (rawPayload ?? {}) as { id?: unknown; password?: unknown };
    if (!isNonEmptyString(id)) {
      return failureResponse("Field 'id' wajib diisi.", 400);
    }
    if (!isNonEmptyString(password) || password.trim().length < MIN_PASSWORD_LENGTH) {
      return failureResponse(`Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.`, 400);
    }

    const { error } = await supabase.auth.admin.updateUserById(id.trim(), { password: password.trim() });
    if (error) {
      return failureResponse(error.message, 400);
    }

    return successResponse("Password berhasil direset.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan tidak terduga.";
    return failureResponse(message, 500);
  }
});
