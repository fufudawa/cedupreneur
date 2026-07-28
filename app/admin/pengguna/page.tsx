"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users, UserRound, GraduationCap, Store, Plus } from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared";
import { Card, Badge, Button, Input, Select } from "@/components/ui";
import { ROLE_LABEL, ROLE_BADGE_VARIANT, getUserIdentity, type UserRole } from "@/lib/adminUsersData";
import { useAdminUsers } from "@/lib/useAdminUsers";

const ROLE_OPTIONS: { value: "all" | UserRole; label: string }[] = [
  { value: "all", label: "Semua Role" },
  { value: "admin", label: "Admin" },
  { value: "dosen", label: "Dosen" },
  { value: "mahasiswa", label: "Mahasiswa" },
  { value: "umkm", label: "UMKM" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
];

const PAGE_SIZE = 10;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function AdminPenggunaPage() {
  const { users, isHydrated } = useAdminUsers();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);

  const totalUsers = users.length;
  const totalDosen = users.filter((user) => user.role === "dosen").length;
  const totalMahasiswa = users.filter((user) => user.role === "mahasiswa").length;
  const totalUmkm = users.filter((user) => user.role === "umkm").length;

  const filteredUsers = useMemo(() => {
    const keyword = search.toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        keyword === "" ||
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword) ||
        user.nip?.toLowerCase().includes(keyword) ||
        user.nim?.toLowerCase().includes(keyword) ||
        user.businessName?.toLowerCase().includes(keyword) ||
        user.businessSector?.toLowerCase().includes(keyword);

      const matchesRole = roleFilter === "all" || user.role === roleFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.isActive) ||
        (statusFilter === "inactive" && !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetFilters() {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setPage(1);
  }

  if (!isHydrated) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Pengguna"
        description="Kelola akun admin, dosen, mahasiswa, dan UMKM mitra."
        actions={
          <Link href="/admin/pengguna/tambah">
            <Button variant="secondary">
              <Plus size={18} strokeWidth={2} />
              Tambah Pengguna
            </Button>
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Pengguna"
          value={totalUsers}
          icon={<Users size={22} strokeWidth={2} />}
          iconClassName="bg-purple/10 text-purple"
          accentClassName="bg-purple"
        />
        <StatCard
          label="Dosen"
          value={totalDosen}
          icon={<UserRound size={22} strokeWidth={2} />}
          iconClassName="bg-orange/10 text-orange"
          accentClassName="bg-orange"
        />
        <StatCard
          label="Mahasiswa"
          value={totalMahasiswa}
          icon={<GraduationCap size={22} strokeWidth={2} />}
          iconClassName="bg-pink/10 text-pink"
          accentClassName="bg-pink"
        />
        <StatCard
          label="UMKM Mitra"
          value={totalUmkm}
          icon={<Store size={22} strokeWidth={2} />}
          iconClassName="bg-green-100 text-green-700"
          accentClassName="bg-green-500"
        />
      </div>

      <Card className="mb-6 rounded-2xl p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[minmax(320px,1fr)_170px_170px]">
          <Input
            id="search-pengguna"
            placeholder="Cari nama, email, NIM, NIP, atau nama usaha..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            id="filter-role"
            options={ROLE_OPTIONS}
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as "all" | UserRole);
              setPage(1);
            }}
          />
          <Select
            id="filter-status"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | "active" | "inactive");
              setPage(1);
            }}
          />
        </div>
      </Card>

      <Card className="min-w-0 rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-navy">Daftar Pengguna</h2>

        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <p className="text-sm font-semibold text-navy">Tidak ada pengguna ditemukan</p>
            <p className="text-sm text-muted">Coba ubah kata pencarian atau filter yang digunakan.</p>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset Filter
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-purple/5">
                <tr>
                  <th className="rounded-l-xl px-4 py-2.5 font-medium text-navy">Nama</th>
                  <th className="px-4 py-2.5 font-medium text-navy">Identitas</th>
                  <th className="px-4 py-2.5 font-medium text-navy">Email</th>
                  <th className="px-4 py-2.5 font-medium text-navy">Role</th>
                  <th className="px-4 py-2.5 font-medium text-navy">Status</th>
                  <th className="px-4 py-2.5 font-medium text-navy">Dibuat Pada</th>
                  <th className="w-[130px] rounded-r-xl px-4 py-2.5 font-medium text-navy">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-gray-dark">
                {paginated.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3.5 align-middle font-medium text-navy">{user.name}</td>
                    <td className="px-4 py-3.5 align-middle text-muted">{getUserIdentity(user)}</td>
                    <td className="max-w-[220px] break-words px-4 py-3.5 align-middle text-muted">{user.email}</td>
                    <td className="px-4 py-3.5 align-middle">
                      <Badge variant={ROLE_BADGE_VARIANT[user.role]}>{ROLE_LABEL[user.role]}</Badge>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <Badge variant={user.isActive ? "green" : "gray"}>
                        {user.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 align-middle text-muted">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3.5 align-middle">
                      <Link href={`/admin/pengguna/${user.id}`} className="flex justify-center">
                        <Button variant="outline" size="sm" className="!px-4 whitespace-nowrap">
                          Lihat Detail
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredUsers.length > PAGE_SIZE && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-soft-gray-dark pt-4 text-sm">
            <span className="text-muted">
              Halaman {currentPage} dari {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    pageNumber === currentPage ? "bg-purple text-white" : "text-navy hover:bg-soft-gray"
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
