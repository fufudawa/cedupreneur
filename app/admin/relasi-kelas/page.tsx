"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { Card, CardHeader, CardTitle, Badge, Button, Select } from "@/components/ui";
import { useKelas, useUmkmMaster, useMahasiswaMaster } from "@/lib/useAdminMasterData";
import { useKelasUmkm } from "@/lib/useKelasUmkm";

export default function RelasiKelasPage() {
  return (
    <Suspense fallback={null}>
      <RelasiKelasContent />
    </Suspense>
  );
}

function RelasiKelasContent() {
  const { kelasList, isHydrated: kelasHydrated } = useKelas();
  const { umkmMasterList, isHydrated: umkmHydrated } = useUmkmMaster();
  const { links, isHydrated: linksHydrated, addLink, removeLink } = useKelasUmkm();
  const { mahasiswaMasterList, isHydrated: mahasiswaHydrated } = useMahasiswaMaster();
  const isHydrated = kelasHydrated && umkmHydrated && linksHydrated && mahasiswaHydrated;

  const searchParams = useSearchParams();
  const kelasIdParam = searchParams.get("kelasId");
  const [manualSelectedId, setManualSelectedId] = useState("");
  const selectedKelasId = manualSelectedId || kelasIdParam || "";

  const [umkmToAdd, setUmkmToAdd] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedKelas = kelasList.find((k) => k.id === selectedKelasId) ?? null;
  const linkedUmkmIds = useMemo(
    () => links.filter((l) => l.kelasId === selectedKelasId).map((l) => l.umkmId),
    [links, selectedKelasId]
  );
  const linkedUmkm = umkmMasterList.filter((u) => linkedUmkmIds.includes(u.id));
  const availableUmkm = umkmMasterList.filter((u) => !linkedUmkmIds.includes(u.id));

  const roster = useMemo(() => {
    if (!selectedKelas) return [];
    return mahasiswaMasterList
      .filter((m) => m.connectedKelas.some((link) => link.kelasId === selectedKelas.id))
      .map((m) => ({ name: m.nama, nim: m.nim }));
  }, [mahasiswaMasterList, selectedKelas]);

  if (!isHydrated) {
    return null;
  }

  async function handleAddUmkm() {
    if (!selectedKelas || umkmToAdd === "") return;
    setError("");
    try {
      await addLink(selectedKelas.id, umkmToAdd);
      setUmkmToAdd("");
      setSuccessMessage("UMKM berhasil dihubungkan ke kelas.");
    } catch (err) {
      console.error("Failed to link umkm to kelas", err);
      setError("Gagal menghubungkan UMKM. Silakan coba lagi.");
    }
  }

  async function handleRemoveUmkm(linkId: string) {
    setError("");
    try {
      await removeLink(linkId);
    } catch (err) {
      console.error("Failed to unlink umkm from kelas", err);
      setError("Gagal memutus relasi UMKM. Silakan coba lagi.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Relasi Kelas"
        description="Hubungkan kelas dengan UMKM mitra. Dosen pengampu diatur lewat Data Master, mahasiswa masuk otomatis lewat kelompok bimbingan."
        actions={
          <Link href="/admin/relasi-kelas/semua">
            <Button variant="outline">Lihat Semua Relasi</Button>
          </Link>
        }
      />

      <Card className="min-w-0 rounded-2xl p-6">
        <CardHeader>
          <CardTitle className="text-lg">Atur Relasi Kelas</CardTitle>
        </CardHeader>

        <div className="flex flex-col gap-5">
          <div className="max-w-[560px]">
            <label htmlFor="pilih-kelas" className="text-sm font-medium text-navy">
              Pilih Kelas
            </label>
            <div className="mt-1.5">
              <Select
                id="pilih-kelas"
                options={[
                  { value: "", label: "Pilih kelas..." },
                  ...kelasList.map((k) => ({ value: k.id, label: `${k.nama} — ${k.mataKuliahNama} — ${k.semester} ${k.tahunAjaran}` })),
                ]}
                value={selectedKelasId}
                onChange={(e) => {
                  setManualSelectedId(e.target.value);
                  setUmkmToAdd("");
                  setSuccessMessage("");
                  setError("");
                }}
              />
            </div>
          </div>

          {!selectedKelas ? (
            <p className="rounded-xl bg-soft-gray px-4 py-6 text-center text-sm text-muted">
              Pilih kelas terlebih dahulu untuk mengatur relasi.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-soft-gray-dark p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted">Mata Kuliah</p>
                  <p className="mt-1 text-sm font-semibold text-navy">{selectedKelas.mataKuliahNama}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Dosen Pengampu</p>
                  <p className="mt-1 text-sm font-semibold text-navy">{selectedKelas.dosenNama}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Semester</p>
                  <p className="mt-1 text-sm font-semibold text-navy">
                    {selectedKelas.semester} {selectedKelas.tahunAjaran}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-navy">UMKM Mitra Terhubung</p>
                {linkedUmkm.length === 0 ? (
                  <p className="mt-2 rounded-xl bg-soft-gray px-4 py-6 text-center text-sm text-muted">
                    Belum ada UMKM yang terhubung dengan kelas ini.
                  </p>
                ) : (
                  <div className="mt-2 flex flex-col gap-2">
                    {linkedUmkm.map((umkm) => {
                      const link = links.find((l) => l.kelasId === selectedKelas.id && l.umkmId === umkm.id);
                      return (
                        <div
                          key={umkm.id}
                          className="flex items-center justify-between rounded-xl border border-soft-gray-dark px-4 py-2.5"
                        >
                          <div>
                            <p className="text-sm font-medium text-navy">{umkm.namaUsaha}</p>
                            <p className="text-xs text-muted">{umkm.sektorUsaha}</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => link && handleRemoveUmkm(link.id)}
                          >
                            Putus Relasi
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Select
                    id="tambah-umkm"
                    options={[
                      { value: "", label: "Pilih UMKM untuk ditambahkan..." },
                      ...availableUmkm.map((u) => ({ value: u.id, label: u.namaUsaha })),
                    ]}
                    value={umkmToAdd}
                    onChange={(e) => setUmkmToAdd(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" variant="secondary" disabled={umkmToAdd === ""} onClick={handleAddUmkm}>
                    + Hubungkan
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-navy">Mahasiswa di Kelas Ini</p>
                <p className="mt-1 text-xs text-muted">
                  Diatur lewat Data Master &gt; Mahasiswa &gt; Atur Kelas — bukan otomatis dari kelompok bimbingan.
                </p>
                {roster.length === 0 ? (
                  <p className="mt-2 rounded-xl bg-soft-gray px-4 py-6 text-center text-sm text-muted">
                    Belum ada mahasiswa yang dihubungkan ke kelas ini. Atur lewat Data Master &gt; Mahasiswa.
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {roster.map((m) => (
                      <Badge key={m.nim} variant="gray">
                        {m.name} ({m.nim})
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-sm font-medium text-red-500">{error}</p>}
              {successMessage && (
                <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{successMessage}</p>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
