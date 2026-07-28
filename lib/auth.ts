import type { Role } from "@/types";
import { CURRENT_USER } from "@/data/users";
import { supabase } from "./supabaseClient";

export type AuthProfile = {
  id: string;
  email: string | null;
  role: Role;
  is_active: boolean | null;
};

type ProfileRelation = {
  id: string;
  email: string | null;
};

type DosenLoginRow = {
  profile_id: string;
  profiles: ProfileRelation | ProfileRelation[] | null;
};

type MahasiswaLoginRow = {
  profile_id: string;
  profiles: ProfileRelation | ProfileRelation[] | null;
};

export class AuthFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthFlowError";
  }
}

function firstRelation<T>(relation: T | T[] | null): T | undefined {
  return Array.isArray(relation) ? relation[0] : relation ?? undefined;
}

function normalizeIdentifier(value: string) {
  return value.trim();
}

async function getEmailByNip(nip: string): Promise<string> {
  const { data, error } = await supabase
    .from("dosen")
    .select(`
      profile_id,
      profiles (
        id,
        email
      )
    `)
    .eq("nip", normalizeIdentifier(nip))
    .maybeSingle();

  if (error) {
    throw new AuthFlowError("NIP tidak ditemukan.");
  }

  const profile = firstRelation((data as DosenLoginRow | null)?.profiles ?? null);

  if (!profile?.email) {
    throw new AuthFlowError("NIP tidak ditemukan.");
  }

  return profile.email;
}

async function getEmailByNim(nim: string): Promise<string> {
  const { data, error } = await supabase
    .from("mahasiswa")
    .select(`
      profile_id,
      profiles (
        id,
        email
      )
    `)
    .eq("nim", normalizeIdentifier(nim))
    .maybeSingle();

  if (error) {
    throw new AuthFlowError("NIM tidak ditemukan.");
  }

  const profile = firstRelation((data as MahasiswaLoginRow | null)?.profiles ?? null);

  if (!profile?.email) {
    throw new AuthFlowError("NIM tidak ditemukan.");
  }

  return profile.email;
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
