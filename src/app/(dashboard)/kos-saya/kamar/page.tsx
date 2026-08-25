"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ClipboardList,
  User,
  Trash2,
  Phone,
  Search,
  CheckCircle,
  AlertTriangle,
  DoorOpen,
  Home,
  Users,
  X,
  MessageCircle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PenghuniItem {
  id: string;
  nama_lengkap: string;
  asal_daerah: string;
  jenis_kelamin: string;
  no_hp: string;
  status_pekerjaan: string;
  foto_url: string | null;
  created_at: string;
}

interface KamarItem {
  id: string;
  nomor_kamar: string;
  kosan_id: string;
  jumlah_penghuni: number;
  hubungan: string | null;
  status: string;
  kosan_nama: string;
  penghuni: PenghuniItem[];
}

export default function KelolaKamarPage() {
  const [kamarList, setKamarList] = useState<KamarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("semua");
  const [selectedKosan, setSelectedKosan] = useState<string>("semua");
  const [kosanOptions, setKosanOptions] = useState<{ id: string; nama: string }[]>([]);

  // Deletion Modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: "penghuni" | "kamar";
    penghuniId?: string;
    penghuniNama?: string;
    kamarId?: string;
    nomorKamar?: string;
  }>({
    isOpen: false,
    type: "penghuni",
  });
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Detail Modal state
  const [detailPenghuni, setDetailPenghuni] = useState<PenghuniItem | null>(null);

  const fetchKamarData = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: kosans } = await supabase
        .from("kosan")
        .select(`
          id,
          nama,
          kamar (
            id,
            nomor_kamar,
            kosan_id,
            jumlah_penghuni,
            hubungan,
            status,
            penghuni (
              id,
              nama_lengkap,
              asal_daerah,
              jenis_kelamin,
              no_hp,
              status_pekerjaan,
              foto_url,
              created_at
            )
          )
        `)
        .eq("pemilik_id", user.id)
        .order("created_at", { ascending: false });

      if (kosans) {
        setKosanOptions(kosans.map((k) => ({ id: k.id, nama: k.nama })));

        const flattenedKamar: KamarItem[] = [];
        kosans.forEach((k: any) => {
          (k.kamar || []).forEach((kmr: any) => {
            flattenedKamar.push({
              ...kmr,
              kosan_nama: k.nama,
              penghuni: kmr.penghuni || [],
            });
          });
        });

        // Sort by room number
        flattenedKamar.sort((a, b) =>
          a.nomor_kamar.localeCompare(b.nomor_kamar, undefined, { numeric: true })
        );

        setKamarList(flattenedKamar);
      }
    } catch (err) {
      console.error("Error fetching kamar data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKamarData();
  }, []);

  // Handle resident removal
  const handleConfirmDelete = async () => {
    setDeleting(true);
    const supabase = createClient();

    try {
      if (deleteModal.type === "penghuni" && deleteModal.penghuniId && deleteModal.kamarId) {
        // 1. Delete resident
        const { error: errDeletePenghuni } = await supabase
          .from("penghuni")
          .delete()
          .eq("id", deleteModal.penghuniId);

        if (errDeletePenghuni) throw errDeletePenghuni;

        // 2. Check remaining residents in this room
        const { data: remaining } = await supabase
          .from("penghuni")
          .select("id")
          .eq("kamar_id", deleteModal.kamarId);

        if (!remaining || remaining.length === 0) {
          // If no residents left, mark kamar as kosong or delete kamar
          await supabase
            .from("kamar")
            .update({ status: "kosong" as any, jumlah_penghuni: 0, hubungan: null })
            .eq("id", deleteModal.kamarId);
        }

        setSuccessMsg(
          `Penghuni "${deleteModal.penghuniNama}" berhasil dikeluarkan. Kamar ${deleteModal.nomorKamar} kini siap diisi kembali.`
        );
      } else if (deleteModal.type === "kamar" && deleteModal.kamarId) {
        // 1. Delete all residents in room
        await supabase
          .from("penghuni")
          .delete()
          .eq("kamar_id", deleteModal.kamarId);

        // 2. Mark kamar as kosong
        await supabase
          .from("kamar")
          .update({ status: "kosong" as any, jumlah_penghuni: 0, hubungan: null })
          .eq("id", deleteModal.kamarId);

        setSuccessMsg(
          `Kamar ${deleteModal.nomorKamar} berhasil dikosongkan. Kamar siap diisi penghuni baru.`
        );
      }

      setDeleteModal({ isOpen: false, type: "penghuni" });
      await fetchKamarData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      alert("Gagal memproses penghapusan: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setDeleting(false);
    }
  };

  // Filter and search
  const filteredKamar = kamarList.filter((kamar) => {
    const matchSearch =
      kamar.nomor_kamar.toLowerCase().includes(search.toLowerCase()) ||
      kamar.kosan_nama.toLowerCase().includes(search.toLowerCase()) ||
      kamar.penghuni.some((p) =>
        p.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
        p.asal_daerah.toLowerCase().includes(search.toLowerCase())
      );

    const matchKosan =
      selectedKosan === "semua" || kamar.kosan_id === selectedKosan;

    const matchStatus =
      filterStatus === "semua" ||
      (filterStatus === "terisi" && kamar.status === "aktif") ||
      (filterStatus === "kosong" && kamar.status === "kosong");

    return matchSearch && matchKosan && matchStatus;
  });

  const totalKamarCount = kamarList.length;
  const kamarTerisiCount = kamarList.filter((k) => k.status === "aktif").length;
  const totalPenghuniCount = kamarList.reduce(
    (sum, k) => sum + (k.penghuni?.length || 0),
    0
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">
            Kelola Kamar & Penghuni
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Pantau status kamar, data penghuni aktif, atau keluarkan penghuni yang sudah pindah
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-medium">{successMsg}</p>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Kamar</p>
              <p className="text-xl font-bold text-gray-900">{totalKamarCount}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Kamar Terisi</p>
              <p className="text-xl font-bold text-gray-900">{kamarTerisiCount}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
              <DoorOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Kamar Kosong</p>
              <p className="text-xl font-bold text-gray-900">{totalKamarCount - kamarTerisiCount}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Penghuni</p>
              <p className="text-xl font-bold text-gray-900">{totalPenghuniCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nomor kamar, nama penghuni, atau asal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 text-sm"
          />
        </div>

        {kosanOptions.length > 1 && (
          <select
            value={selectedKosan}
            onChange={(e) => setSelectedKosan(e.target.value)}
            className="input-field text-sm w-full sm:w-48"
          >
            <option value="semua">Semua Kosan</option>
            {kosanOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.nama}
              </option>
            ))}
          </select>
        )}

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-field text-sm w-full sm:w-40"
        >
          <option value="semua">Semua Status</option>
          <option value="terisi">Kamar Terisi</option>
          <option value="kosong">Kamar Kosong</option>
        </select>
      </div>

      {/* Kamar Cards Grid */}
      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="card animate-pulse p-6">
              <div className="h-6 w-1/3 rounded bg-gray-200" />
              <div className="mt-4 h-16 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : filteredKamar.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredKamar.map((kamar) => {
            const isTerisi = kamar.status === "aktif" && kamar.penghuni.length > 0;

            return (
              <div
                key={kamar.id}
                className={`card transition-all duration-200 hover:shadow-md ${
                  isTerisi ? "border-teal-200 bg-white" : "border-gray-200 bg-gray-50/60"
                }`}
              >
                {/* Header Kamar */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading text-lg font-bold text-gray-900">
                        Kamar {kamar.nomor_kamar}
                      </h3>
                      {kamar.hubungan && isTerisi && (
                        <span className="badge badge-warning text-[10px]">
                          {kamar.hubungan === "suami_istri"
                            ? "Suami-Istri"
                            : kamar.hubungan === "saudara"
                            ? "Saudara"
                            : kamar.hubungan === "teman"
                            ? "Teman"
                            : kamar.hubungan === "kerabat"
                            ? "Kerabat"
                            : "Lainnya"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{kamar.kosan_nama}</p>
                  </div>

                  <span
                    className={`badge ${
                      isTerisi ? "badge-success" : "badge-neutral"
                    }`}
                  >
                    {isTerisi ? "Terisi" : "Kosong"}
                  </span>
                </div>

                {/* Penghuni List inside Kamar */}
                <div className="mt-4 space-y-2.5">
                  {kamar.penghuni && kamar.penghuni.length > 0 ? (
                    kamar.penghuni.map((p) => {
                      const cleanPhone = p.no_hp.replace(/\D/g, "");
                      const waFormatted = cleanPhone.startsWith("0")
                        ? "62" + cleanPhone.slice(1)
                        : cleanPhone.startsWith("62")
                        ? cleanPhone
                        : "62" + cleanPhone;

                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 p-2.5 hover:bg-white transition-colors"
                        >
                          <div
                            onClick={() => setDetailPenghuni(p)}
                            className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                          >
                            {p.foto_url ? (
                              <img
                                src={p.foto_url}
                                alt={p.nama_lengkap}
                                className="h-9 w-9 rounded-full object-cover shrink-0 border border-teal-200"
                              />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                                <User className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-gray-900 hover:text-teal-600">
                                {p.nama_lengkap}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                <span>{p.asal_daerah}</span>
                                <span>&bull;</span>
                                <span className="capitalize text-teal-700 font-medium">
                                  {p.status_pekerjaan}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Action: WA & Delete */}
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {p.no_hp && (
                              <a
                                href={`https://wa.me/${waFormatted}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Chat WhatsApp"
                                className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </a>
                            )}
                            <button
                              onClick={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  type: "penghuni",
                                  penghuniId: p.id,
                                  penghuniNama: p.nama_lengkap,
                                  kamarId: kamar.id,
                                  nomorKamar: kamar.nomor_kamar,
                                })
                              }
                              title="Keluarkan / Hapus Penghuni"
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center">
                      <DoorOpen className="mx-auto h-6 w-6 text-gray-300" />
                      <p className="mt-1 text-xs text-gray-400">
                        Kamar ini kosong. Siap didaftarkan via QR Code.
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Kamar */}
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
                  <span>
                    {kamar.penghuni?.length || 0} penghuni aktif
                  </span>

                  {isTerisi && (
                    <button
                      onClick={() =>
                        setDeleteModal({
                          isOpen: true,
                          type: "kamar",
                          kamarId: kamar.id,
                          nomorKamar: kamar.nomor_kamar,
                        })
                      }
                      className="text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:underline"
                    >
                      Kosongkan Kamar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card py-16 text-center mt-6">
          <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 font-heading text-base font-semibold text-gray-900">
            Tidak ada kamar ditemukan
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {search || filterStatus !== "semua"
              ? "Coba sesuaikan kata kunci pencarian atau filter status."
              : "Kamar akan otomatis terdaftar saat penghuni mengisi formulir dari QR Code."}
          </p>
        </div>
      )}

      {/* Confirmation Modal: Delete / Remove Resident */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                <AlertTriangle className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-gray-900">
                  {deleteModal.type === "penghuni"
                    ? "Keluarkan Penghuni?"
                    : "Kosongkan Kamar?"}
                </h3>
                <p className="text-xs text-gray-500">Konfirmasi pengosongan data</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-600 leading-relaxed">
              {deleteModal.type === "penghuni" ? (
                <>
                  Apakah Anda yakin ingin mengeluarkan{" "}
                  <strong className="text-gray-900">{deleteModal.penghuniNama}</strong> dari{" "}
                  <strong>Kamar {deleteModal.nomorKamar}</strong>?
                  <br />
                  <span className="mt-2 block text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                    💡 Setelah dikeluarkan, kamar ini akan kembali kosong dan siap diisi oleh penghuni baru lewat QR Code.
                  </span>
                </>
              ) : (
                <>
                  Apakah Anda yakin ingin mengosongkan seluruh data di{" "}
                  <strong>Kamar {deleteModal.nomorKamar}</strong>?
                  <br />
                  <span className="mt-2 block text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    ⚠️ Semua penghuni di kamar ini akan dihapus dari sistem kelurahan.
                  </span>
                </>
              )}
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, type: "penghuni" })}
                disabled={deleting}
                className="btn-ghost flex-1 text-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="btn-danger flex-1 text-sm bg-rose-600 hover:bg-rose-700"
              >
                {deleting ? "Memproses..." : "Ya, Keluarkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resident Detail Modal */}
      {detailPenghuni && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="font-heading text-lg font-bold text-gray-900">
                Detail Data Penghuni
              </h3>
              <button
                onClick={() => setDetailPenghuni(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-6 flex flex-col items-center text-center">
              {detailPenghuni.foto_url ? (
                <img
                  src={detailPenghuni.foto_url}
                  alt={detailPenghuni.nama_lengkap}
                  className="h-24 w-24 rounded-2xl object-cover border-2 border-teal-500 shadow-md"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                  <User className="h-10 w-10" />
                </div>
              )}
              <h4 className="mt-3 font-heading text-lg font-bold text-gray-900">
                {detailPenghuni.nama_lengkap}
              </h4>
              <p className="text-xs text-gray-500">
                {detailPenghuni.jenis_kelamin === "laki_laki" ? "Laki-laki" : "Perempuan"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Asal Daerah</p>
                <p className="text-sm font-semibold text-gray-800">{detailPenghuni.asal_daerah}</p>
              </div>

              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Status Pekerjaan</p>
                <p className="text-sm font-semibold text-gray-800 capitalize">
                  {detailPenghuni.status_pekerjaan}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Nomor WhatsApp/HP</p>
                <p className="text-sm font-semibold text-gray-800">{detailPenghuni.no_hp}</p>
              </div>

              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Tanggal Terdaftar</p>
                <p className="text-sm font-semibold text-gray-800">
                  {formatDate(detailPenghuni.created_at)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3 border-t border-gray-100 pt-4">
              <button
                onClick={() => setDetailPenghuni(null)}
                className="btn-ghost flex-1 text-sm"
              >
                Tutup
              </button>
              {detailPenghuni.no_hp && (
                <a
                  href={`https://wa.me/${
                    detailPenghuni.no_hp.replace(/\D/g, "").startsWith("0")
                      ? "62" + detailPenghuni.no_hp.replace(/\D/g, "").slice(1)
                      : detailPenghuni.no_hp.replace(/\D/g, "")
                  }`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex-1 text-sm bg-emerald-600 hover:bg-emerald-700"
                >
                  <MessageCircle className="mr-1.5 h-4 w-4" /> Hubungi WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
