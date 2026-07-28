"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/shared";
import { loginWithNim, requireRole } from "@/lib/auth";

export default function MahasiswaLoginPage() {
  const router = useRouter();
  const [nim, setNim] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const normalizedNim = nim.trim();

    if (!normalizedNim) {
      setErrorMessage("NIM wajib diisi.");
      return;
    }

    if (!password) {
      setErrorMessage("Password wajib diisi.");
      return;
    }

    setIsLoading(true);

    try {
      await loginWithNim(normalizedNim, password);
      await requireRole("mahasiswa");
      router.replace("/mahasiswa/dashboard");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Login gagal. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-white lg:flex-row">
      <div className="relative flex min-h-[420px] flex-1 flex-col items-center justify-center overflow-hidden px-8 py-16 lg:min-h-screen">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(48deg, rgb(240, 224, 255) 50%, rgb(255, 245, 240) 77.5%, rgb(255, 229, 199) 100%)",
          }}
        />

        <div className="relative flex w-full max-w-xs flex-col items-center text-center sm:max-w-sm lg:max-w-md">
          <BrandMark className="aspect-[6000/4219] w-full" />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-8 py-16 sm:px-14 lg:px-20">
        <div className="w-full max-w-md rounded-3xl border border-soft-gray-dark bg-white/95 p-6 shadow-[0px_12px_30px_0px_rgba(23,18,46,0.1)] sm:p-8">
          <p className="text-xs font-semibold text-purple sm:text-sm">
            Creative Edupreneur Ecosystem by Polimedia
          </p>
          <div className="mt-3 border-t border-soft-gray-dark" />

          <h1 className="mt-6 text-2xl font-extrabold text-navy sm:text-3xl">
            Login sebagai mahasiswa
          </h1>
          <p className="mt-2 text-sm text-muted sm:text-base">
            Mahasiswa bertugas untuk update project
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nim" className="text-xs font-bold text-navy sm:text-sm">
                NIM
              </label>
              <input
                id="nim"
                type="text"
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                placeholder="Masukkan NIM"
                className="w-full rounded-xl border-[1.6px] border-purple bg-white px-4 py-3 text-sm text-navy outline-none placeholder:text-muted sm:text-base"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-bold text-navy sm:text-sm">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan Password"
                className="w-full rounded-xl border-[1.6px] border-purple bg-white px-4 py-3 text-sm text-navy outline-none placeholder:text-muted sm:text-base"
              />
            </div>

            {errorMessage && (
              <p className="text-sm font-medium text-red-600" aria-live="polite">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-xl bg-purple py-3 text-base font-bold text-white transition-colors hover:bg-purple-dark"
            >
              {isLoading ? "Masuk..." : "Login"}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-soft-gray-dark" />
            <span className="text-sm text-muted">atau</span>
            <div className="h-px flex-1 bg-soft-gray-dark" />
          </div>

          <Link
            href="/login"
            className="mt-4 flex items-center justify-center text-sm font-medium text-purple hover:text-purple-dark"
          >
            Kembali ke pilihan peran
          </Link>
        </div>
      </div>
    </div>
  );
}
