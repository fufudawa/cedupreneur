import type { Role } from "@/types";
import { CURRENT_USER } from "@/data/users";
import { supabase } from "./supabaseClient";

export type AuthProfile = {
  id: string;
  email: string | null;
  role: Role;
  is_active: boolean | null;
};

export class AuthFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthFlowError";
  }
}

function normalizeIdentifier(value: string) {
  return value.trim();
}

async function getEmailByNip(nip: string): Promise<string> {
  // A raw `.from("dosen").select(...)` can't work here — RLS only lets a
  // dosen read their OWN row (auth.uid()), and this lookup runs before
  // login, with no session yet. This SECURITY DEFINER RPC returns just the
  // email for a matching NIP, nothing else, so anon can call it safely.
  const { data, error } = await supabase.rpc("get_login_email_by_nip", { p_nip: normalizeIdentifier(nip) });

  if (error || !data) {
    throw new AuthFlowError("NIP tidak ditemukan.");
  }

  return data as string;
}

async function getEmailByNim(nim: string): Promise<string> {
  // Same reasoning as getEmailByNip above — RLS only allows a mahasiswa to
  // read their own row, but this lookup runs before login.
  const { data, error } = await supabase.rpc("get_login_email_by_nim", { p_nim: normalizeIdentifier(nim) });

  if (error || !data) {
    throw new AuthFlowError("NIM tidak ditemukan.");
  }

  return data as string;
}

async function signInWithEmail(email: string, password: string, errorMessage: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.session) {
    throw new AuthFlowError(errorMessage);
  }

  return data.session;
}

export async function loginWithEmail(email: string, password: string) {
  return signInWithEmail(email, password, "Email atau password salah.");
}

export async function loginWithNip(nip: string, password: string) {
  const email = await getEmailByNip(nip);
  return signInWithEmail(email, password, "Password salah.");
}

export async function loginWithNim(nim: string, password: string) {
  const email = await getEmailByNim(nim);
  return signInWithEmail(email, password, "Password salah.");
}

export async function getCurrentProfile(): Promise<AuthProfile> {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new AuthFlowError("Session tidak ditemukan.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role, is_active")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error || !data) {
    throw new AuthFlowError("Profile pengguna tidak ditemukan.");
  }

  const profile = data as AuthProfile;

  if (!profile.is_active) {
    await signOut();
    throw new AuthFlowError("Akun tidak aktif.");
  }

  return profile;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function requireRole(expectedRole: Role): Promise<AuthProfile> {
  const profile = await getCurrentProfile();

  if (profile.role !== expectedRole) {
    await signOut();
    throw new AuthFlowError("Role akun tidak sesuai untuk halaman login ini.");
  }

  return profile;
}

// Placeholder auth helper. Belum terhubung ke backend/Supabase.
// Untuk sekarang selalu mengembalikan user dummy sesuai role.

export function getCurrentUser(role: Role) {
  return CURRENT_USER[role];
}
