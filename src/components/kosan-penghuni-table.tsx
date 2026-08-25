"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Calendar,
  Trash2,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface PenghuniData {
  id: string;
  nama_lengkap: string;
  asal_daerah: string;
  jenis_kelamin: string;
  no_hp: string;
  status_pekerjaan: string;
  foto_url: string | null;
  created_at: string;
  kamar_id: string;
  nomor_kamar: string;
  hubungan: string | null;
}

interface Props {
  initialPenghuniList: PenghuniData[];
  kosanNama: string;
}

export function KosanPenghuniTable({ initialPenghuniList, kosanNama }: Props) {
  const [penghuniList, setPenghuniList] = useState<PenghuniData[]>(initialPenghuniList);
  const [deleteTarget, setDeleteTarget] = useState<PenghuniData | null>(null);
  const [detailTarget, setDetailTarget] = useState<PenghuniData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();

    try {
      // 1. Delete resident
      const { error } = await supabase
        .from("penghuni")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;

      // 2. Check if remaining in kamar
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

      setPenghuniList((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setSuccessMsg(`Penghuni "${deleteTarget.nama_lengkap}" berhasil dikeluarkan.`);
      setDeleteTarget(null);
      router.refresh();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      alert("Gagal menghapus penghuni: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold text-gray-900">
            Daftar Penghuni Berdasarkan Kamar
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Total {penghuniList.length} penghuni terdaftar di {kosanNama}
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Nama
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Kamar
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Hubungan
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Asal
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Status
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
            {penghuniList.length > 0 ? (
              penghuniList.map((p) => {
                const cleanPhone = p.no_hp.replace(/\D/g, "");
                const waFormatted = cleanPhone.startsWith("0")
                  ? "62" + cleanPhone.slice(1)
                  : cleanPhone.startsWith("62")
                  ? cleanPhone
                  : "62" + cleanPhone;

                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div
                        onClick={() => setDetailTarget(p)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        {p.foto_url ? (
                          <img
                            src={p.foto_url}
                            alt={p.nama_lengkap}
                            className="h-8 w-8 rounded-full object-cover shrink-0 border border-teal-200"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-700 shrink-0">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <span className="text-sm font-medium text-gray-900 block group-hover:text-teal-600">
                            {p.nama_lengkap}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            {p.no_hp}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-teal-800">
                      Kamar {p.nomor_kamar}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {p.hubungan ? (
                        <span className="badge badge-warning text-[11px]">
                          {p.hubungan === "suami_istri"
                            ? "Suami-Istri"
                            : p.hubungan === "saudara"
                            ? "Saudara"
                            : p.hubungan === "teman"
                            ? "Teman"
                            : p.hubungan === "kerabat"
                            ? "Kerabat"
                            : "Lainnya"}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Sendiri</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {p.asal_daerah}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-success capitalize text-[11px]">
                        {p.status_pekerjaan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(p.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetailTarget(p)}
                          title="Lihat Detail"
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {p.no_hp && (
                          <a
                            href={`https://wa.me/${waFormatted}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Chat WhatsApp"
                            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          onClick={() => setDeleteTarget(p)}
                          title="Keluarkan / Hapus Penghuni"
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
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
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                  Belum ada penghuni terdaftar di kosan ini
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                <AlertTriangle className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-gray-900">
                  Keluarkan Penghuni?
                </h3>
                <p className="text-xs text-gray-500">Konfirmasi pengosongan data</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-600 leading-relaxed">
              Apakah Anda yakin ingin mengeluarkan{" "}
              <strong className="text-gray-900">{deleteTarget.nama_lengkap}</strong> dari{" "}
              <strong>Kamar {deleteTarget.nomor_kamar}</strong>?
              <br />
              <span className="mt-2 block text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                💡 Kamar ini akan otomatis berstatus kosong jika sudah tidak ada penghuni lain di dalamnya.
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
                {deleting ? "Memproses..." : "Ya, Keluarkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="font-heading text-lg font-bold text-gray-900">
                Detail Data Penghuni
              </h3>
              <button
                onClick={() => setDetailTarget(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-6 flex flex-col items-center text-center">
              {detailTarget.foto_url ? (
                <img
                  src={detailTarget.foto_url}
                  alt={detailTarget.nama_lengkap}
                  className="h-24 w-24 rounded-2xl object-cover border-2 border-teal-500 shadow-md"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                  <User className="h-10 w-10" />
                </div>
              )}
              <h4 className="mt-3 font-heading text-lg font-bold text-gray-900">
                {detailTarget.nama_lengkap}
              </h4>
              <p className="text-xs text-gray-500">
                {detailTarget.jenis_kelamin === "laki_laki" ? "Laki-laki" : "Perempuan"} &bull;{" "}
                <span className="font-semibold text-teal-700">Kamar {detailTarget.nomor_kamar}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Asal Daerah</p>
                <p className="text-sm font-semibold text-gray-800">{detailTarget.asal_daerah}</p>
              </div>

              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Status Pekerjaan</p>
                <p className="text-sm font-semibold text-gray-800 capitalize">
                  {detailTarget.status_pekerjaan}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Nomor WhatsApp/HP</p>
                <p className="text-sm font-semibold text-gray-800 font-mono">{detailTarget.no_hp}</p>
              </div>

              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Tanggal Terdaftar</p>
                <p className="text-sm font-semibold text-gray-800">
                  {formatDate(detailTarget.created_at)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3 border-t border-gray-100 pt-4">
              <button
                onClick={() => setDetailTarget(null)}
                className="btn-ghost flex-1 text-sm"
              >
                Tutup
              </button>
              {detailTarget.no_hp && (
                <a
                  href={`https://wa.me/${
                    detailTarget.no_hp.replace(/\D/g, "").startsWith("0")
                      ? "62" + detailTarget.no_hp.replace(/\D/g, "").slice(1)
                      : detailTarget.no_hp.replace(/\D/g, "")
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
