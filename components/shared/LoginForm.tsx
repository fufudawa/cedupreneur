import Link from "next/link";
import { Button, Card, Input } from "@/components/ui";
import type { Role } from "@/types";
import { ROLE_LABEL } from "@/types";

interface LoginFormProps {
  role: Role;
}

export function LoginForm({ role }: LoginFormProps) {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-soft-gray px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl header-gradient text-sm font-bold text-white">
            CP
          </div>
          <h1 className="text-lg font-bold text-navy">Masuk sebagai {ROLE_LABEL[role]}</h1>
          <p className="text-sm text-gray-400">CEdPreneur - Sistem Edupreneur UMKM</p>
        </div>
        <form className="flex flex-col gap-4">
          <Input label="Email" type="email" id="email" placeholder="nama@email.com" />
          <Input label="Kata Sandi" type="password" id="password" placeholder="••••••••" />
          <Button type="submit" className="mt-2 w-full">
            Masuk
          </Button>
        </form>
        <Link
          href="/login"
          className="mt-4 block text-center text-sm text-gray-400 hover:text-purple"
        >
          Kembali pilih peran
        </Link>
      </Card>
    </div>
  );
}
