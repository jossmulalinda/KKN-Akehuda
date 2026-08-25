"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  User,
  ClipboardList,
  Trash2,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PenghuniRow {
  id: string;
  nama_lengkap: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  asal_daerah: string;
  jenis_kelamin: string;
  no_hp: string;
  status_pekerjaan: string;
  foto_url: string | null;
  created_at: string;
  kamar_id: string;
  kosan_id: string;
  kosan: { nama: string } | null;
  kamar: { nomor_kamar: string; hubungan: string | null } | null;
}

export default function PenghuniPage() {
  const [penghuni, setPenghuni] = useState<PenghuniRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterKosan, setFilterKosan] = useState("semua");
  const [loading, setLoading] = useState(true);
  const [kosanList, setKosanList] = useState<{ id: string; nama: string }[]>([]);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<PenghuniRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Detail modal state
  const [detailPenghuni, setDetailPenghuni] = useState<PenghuniRow | null>(null);

  const fetchPenghuni = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("penghuni")
      .select(`
        *,
        kosan (id, nama),
        kamar (nomor_kamar, hubungan)
      `)
      .order("created_at", { ascending: false });

    if (data) {
      const rows = data as unknown as PenghuniRow[];
      setPenghuni(rows);

      // Extract unique kosans for filter
      const uniqueKosans: { id: string; nama: string }[] = [];
      const seen = new Set<string>();
      rows.forEach((r) => {
        if (r.kosan && !seen.has(r.kosan_id)) {
          seen.add(r.kosan_id);
          uniqueKosans.push({ id: r.kosan_id, nama: r.kosan.nama });
        }
      });
      setKosanList(uniqueKosans);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPenghuni();
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();

    try {
      // 1. Delete resident
      const { error: errDelete } = await supabase
        .from("penghuni")
        .delete()
        .eq("id", deleteTarget.id);

      if (errDelete) throw errDelete;

      // 2. Check if remaining residents in that kamar
      if (deleteTarget.kamar_id) {
        const { data: remaining } = await supabase
          .from("penghuni")
          .select("id")
          .eq("kamar_id", deleteTarget.kamar_id);

        if (!remaining || remaining.length === 0) {
          await supabase
            .from("kamar")
            .update({ status: "kosong" as any, jumlah_penghuni: 0, hubungan: null })
            .eq("id", deleteTarget.kamar_id);
        }
      }

      setSuccessMsg(
        `Penghuni "${deleteTarget.nama_lengkap}" berhasil dihapus dari sistem.`
      );
      setDeleteTarget(null);
      await fetchPenghuni();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      alert("Gagal menghapus penghuni: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setDeleting(false);
    }
  };

  const filtered = penghuni.filter((p) => {
    const matchSearch =
      p.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
      p.asal_daerah.toLowerCase().includes(search.toLowerCase()) ||
      (p.kosan?.nama || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.kamar?.nomor_kamar || "").toLowerCase().includes(search.toLowerCase());

    const matchStatus = filterStatus ? p.status_pekerjaan === filterStatus : true;
    const matchKosan = filterKosan === "semua" || p.kosan_id === filterKosan;

    return matchSearch && matchStatus && matchKosan;
  });

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">
            Data Penghuni
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Semua penghuni kosan yang terdaftar di Kelurahan Akehuda
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

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama, kamar, kosan, atau asal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 text-sm"
          />
        </div>

        {kosanList.length > 1 && (
          <select
            value={filterKosan}
            onChange={(e) => setFilterKosan(e.target.value)}
            className="input-field w-full text-sm sm:w-48"
          >
            <option value="semua">Semua Kosan</option>
            {kosanList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
        )}

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-field w-full text-sm sm:w-44"
        >
          <option value="">Semua Status</option>
          <option value="mahasiswa">Mahasiswa</option>
          <option value="pekerja">Pekerja</option>
          <option value="lainnya">Lainnya</option>
        </select>
      </div>

      {/* Stats */}
      <div className="mt-4 text-xs text-gray-500 font-medium">
        Menampilkan {filtered.length} dari {penghuni.length} total penghuni terdaftar
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Penghuni
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Kosan & Kamar
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Asal
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Hubungan
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                No. HP
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Terdaftar
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                  Memuat data penghuni...
                </td>
              </tr>
            ) : filtered.length > 0 ? (
              filtered.map((p) => {
                const cleanPhone = p.no_hp.replace(/\D/g, "");
                const waFormatted = cleanPhone.startsWith("0")
                  ? "62" + cleanPhone.slice(1)
                  : cleanPhone.startsWith("62")
                  ? cleanPhone
                  : "62" + cleanPhone;

                return (
                  <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div
                        onClick={() => setDetailPenghuni(p)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        {p.foto_url ? (
                          <img
                            src={p.foto_url}
                            alt={p.nama_lengkap}
                            className="h-9 w-9 rounded-full object-cover shrink-0 border border-teal-200"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-teal-700 shrink-0">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                            {p.nama_lengkap}
                          </p>
                          <p className="text-xs text-gray-400">
                            {p.jenis_kelamin === "laki_laki" ? "Laki-laki" : "Perempuan"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{p.kosan?.nama || "-"}</p>
                      <p className="text-xs text-teal-700 font-semibold">
                        Kamar {p.kamar?.nomor_kamar || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {p.asal_daerah}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-success capitalize text-[11px]">
                        {p.status_pekerjaan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.kamar?.hubungan ? (
                        <span className="badge badge-warning text-[11px]">
                          {p.kamar.hubungan === "suami_istri"
                            ? "Suami-Istri"
                            : p.kamar.hubungan === "saudara"
                            ? "Saudara"
                            : p.kamar.hubungan === "teman"
                            ? "Teman"
                            : p.kamar.hubungan === "kerabat"
                            ? "Kerabat"
                            : "Lainnya"}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Sendiri</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono text-xs">
                      {p.no_hp}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setDetailPenghuni(p)}
                          title="Lihat Detail"
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {p.no_hp && (
                          <a
                            href={`https://wa.me/${waFormatted}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp"
                            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          onClick={() => setDeleteTarget(p)}
                          title="Hapus / Keluarkan Penghuni"
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-3 font-semibold text-gray-700 text-sm">
                    Belum ada data penghuni
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Data akan otomatis masuk saat penghuni melakukan scan QR Code.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                <AlertTriangle className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-gray-900">
                  Hapus / Keluarkan Penghuni?
                </h3>
                <p className="text-xs text-gray-500">Aksi ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data penghuni{" "}
              <strong className="text-gray-900">{deleteTarget.nama_lengkap}</strong> dari{" "}
              <strong>{deleteTarget.kosan?.nama}</strong> (Kamar{" "}
              {deleteTarget.kamar?.nomor_kamar})?
              <br />
              <span className="mt-2 block text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                💡 Jika tidak ada penghuni lain di kamar ini, status kamar otomatis menjadi kosong dan siap didaftarkan oleh penghuni baru.
              </span>
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
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
                {deleting ? "Menghapus..." : "Ya, Hapus"}
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
                <p className="text-xs text-gray-400">Kosan</p>
                <p className="text-sm font-semibold text-gray-800">{detailPenghuni.kosan?.nama || "-"}</p>
              </div>

              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Nomor Kamar</p>
                <p className="text-sm font-semibold text-teal-700">
                  Kamar {detailPenghuni.kamar?.nomor_kamar || "-"}
                </p>
              </div>

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
                <p className="text-sm font-semibold text-gray-800 font-mono">{detailPenghuni.no_hp}</p>
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
