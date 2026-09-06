"use client";

import { useState, useEffect, useRef } from "react";
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
  Users,
  DoorOpen,
  RotateCcw,
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

const getHubunganBadge = (hubungan: string | null | undefined) => {
  let label = "Lainnya";
  switch (hubungan) {
    case "suami_istri":
      label = "Suami - Istri";
      break;
    case "saudara":
      label = "Saudara / Family";
      break;
    case "teman":
      label = "Teman";
      break;
    case "kerabat":
      label = "Kerabat";
      break;
    default:
      label = "Lainnya";
      break;
  }
  return {
    label,
    color: "bg-amber-50 text-amber-800 border-amber-200",
  };
};

interface Props {
  initialPenghuniList: PenghuniData[];
  kosanNama: string;
}

export function KosanPenghuniTable({ initialPenghuniList, kosanNama }: Props) {
  const [penghuniList, setPenghuniList] = useState<PenghuniData[]>(initialPenghuniList);
  const [deleteTarget, setDeleteTarget] = useState<PenghuniData | null>(null);
  const [detailTarget, setDetailTarget] = useState<PenghuniData | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const router = useRouter();

  // Undo 10-Second State
  const [undoState, setUndoState] = useState<{
    target: PenghuniData;
    originalList: PenghuniData[];
    countdown: number;
  } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const undoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    };
  }, []);

  const startUndoDelete = (target: PenghuniData) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);

    const prevList = [...penghuniList];
    // Optimistically remove from view
    setPenghuniList((prev) => prev.filter((item) => item.id !== target.id));
    setDeleteTarget(null);

    setUndoState({
      target,
      originalList: prevList,
      countdown: 10,
    });

    undoIntervalRef.current = setInterval(() => {
      setUndoState((prev) => {
        if (!prev) return null;
        if (prev.countdown <= 1) {
          return { ...prev, countdown: 0 };
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);

    undoTimerRef.current = setTimeout(async () => {
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
      setUndoState(null);
      await executePermanentDelete(target);
    }, 10000);
  };

  const handleUndo = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);

    if (undoState) {
      setPenghuniList(undoState.originalList);
    }
    setUndoState(null);
    setSuccessMsg("Pengeluaran penghuni dibatalkan. Data tetap aman.");
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleFinalizeDelete = async () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);

    if (undoState) {
      const target = undoState.target;
      setUndoState(null);
      await executePermanentDelete(target);
    }
  };

  const executePermanentDelete = async (target: PenghuniData) => {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("penghuni")
        .delete()
        .eq("id", target.id);

      if (error) throw error;

      const { data: remaining } = await supabase
        .from("penghuni")
        .select("id")
        .eq("kamar_id", target.kamar_id);

      if (!remaining || remaining.length === 0) {
        await supabase
          .from("kamar")
          .update({ status: "kosong" as any, jumlah_penghuni: 0, hubungan: null })
          .eq("id", target.kamar_id);
      } else {
        await supabase
          .from("kamar")
          .update({ jumlah_penghuni: remaining.length })
          .eq("id", target.kamar_id);
      }

      setSuccessMsg(`Penghuni "${target.nama_lengkap}" telah dikeluarkan permanen.`);
      router.refresh();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert("Gagal menghapus penghuni: " + (err.message || "Terjadi kesalahan"));
      router.refresh();
    }
  };

  // Find all roommates for the selected detail resident
  const roomMates = detailTarget
    ? penghuniList.filter((p) => p.kamar_id === detailTarget.kamar_id)
    : [];

  // Group penghuni by kamar_id so each room is displayed as 1 clean row
  const groupedRooms = Object.values(
    penghuniList.reduce((acc, p) => {
      const key = p.kamar_id || p.id;
      if (!acc[key]) {
        acc[key] = {
          kamarId: p.kamar_id,
          nomorKamar: p.nomor_kamar,
          hubungan: p.hubungan,
          primaryPenghuni: p,
          allPenghuni: [p],
        };
      } else {
        acc[key].allPenghuni.push(p);
      }
      return acc;
    }, {} as Record<string, {
      kamarId: string;
      nomorKamar: string;
      hubungan: string | null;
      primaryPenghuni: PenghuniData;
      allPenghuni: PenghuniData[];
    }>)
  );

  return (
    <div className="card shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-gray-900">
            Daftar Penghuni Berdasarkan Kamar
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Total {penghuniList.length} penghuni ({groupedRooms.length} kamar terisi) di {kosanNama}
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
                Nama Penghuni
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                L/P
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Kamar
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Penghuni Kamar
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
            {groupedRooms.length > 0 ? (
              groupedRooms.map((room) => {
                const p = room.primaryPenghuni;
                const cleanPhone = p.no_hp.replace(/\D/g, "");
                const waFormatted = cleanPhone.startsWith("0")
                  ? "62" + cleanPhone.slice(1)
                  : cleanPhone.startsWith("62")
                  ? cleanPhone
                  : "62" + cleanPhone;

                const countInRoom = room.allPenghuni.length;
                const roommates = room.allPenghuni.slice(1);

                return (
                  <tr key={room.kamarId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div
                        onClick={() => setDetailTarget(p)}
                        className="cursor-pointer group"
                      >
                        <span className="text-sm font-semibold text-gray-900 block group-hover:text-teal-600">
                          {p.nama_lengkap}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          {p.no_hp}
                        </span>
                        {roommates.length > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
                            <span className="text-teal-600 font-semibold">+ Bersama:</span>
                            <span
                              className="font-medium text-gray-700 truncate max-w-[200px]"
                              title={roommates.map((r) => r.nama_lengkap).join(", ")}
                            >
                              {roommates.map((r) => r.nama_lengkap).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${
                          p.jenis_kelamin === "laki_laki"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-pink-100 text-pink-800"
                        }`}
                        title={
                          p.jenis_kelamin === "laki_laki"
                            ? "Laki-laki (Penghuni Utama)"
                            : "Perempuan (Penghuni Utama)"
                        }
                      >
                        {p.jenis_kelamin === "laki_laki" ? "L" : "P"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-teal-800">
                      Kamar {room.nomorKamar}
                    </td>
                    <td className="px-4 py-3">
                      {countInRoom > 1 ? (
                        <div
                          onClick={() => setDetailTarget(p)}
                          className="cursor-pointer inline-flex flex-col gap-1 items-start group"
                          title="Klik untuk lihat rincian teman sekamar"
                        >
                          <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-800 border border-teal-200 group-hover:bg-teal-100 transition-colors">
                            <Users className="h-3 w-3 text-teal-600" />
                            {countInRoom} Orang
                          </span>
                          {room.hubungan && (
                            <span
                              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${
                                getHubunganBadge(room.hubungan).color
                              }`}
                            >
                              {getHubunganBadge(room.hubungan).label}
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setDetailTarget(p)}
                          className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                          <User className="h-3 w-3 text-gray-400" />
                          1 Orang
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
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
                          title="Lihat Detail & Teman Sekamar"
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-teal-600 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {p.no_hp && (
                          <a
                            href={`https://wa.me/${waFormatted}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Chat WhatsApp (${p.nama_lengkap})`}
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
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                  Belum ada penghuni terdaftar di kosan ini
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal: Keluarkan Penghuni */}
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
                className="btn-ghost flex-1 text-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => startUndoDelete(deleteTarget)}
                className="btn-danger flex-1 text-sm bg-rose-600 hover:bg-rose-700"
              >
                Ya, Keluarkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating 10-Second Undo Notification */}
      {undoState && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3.5 rounded-2xl bg-gray-900/95 px-5 py-3.5 text-white shadow-2xl backdrop-blur-md border border-gray-700 animate-in slide-in-from-bottom-5 max-w-md w-[calc(100%-3rem)] sm:w-auto">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/30">
            <span>{undoState.countdown}s</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">
              {undoState.target.nama_lengkap} (Kamar {undoState.target.nomor_kamar})
            </p>
            <p className="text-[11px] text-gray-400">
              Dikeluarkan permanen dalam {undoState.countdown} detik...
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleUndo}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 px-3 py-1.5 text-xs font-bold text-white transition-all shadow-md active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>BATALKAN</span>
            </button>
            <button
              onClick={handleFinalizeDelete}
              className="rounded-lg px-2 py-1.5 text-[11px] text-gray-400 hover:text-white transition-colors"
              title="Keluarkan sekarang tanpa menunggu"
            >
              Keluarkan Segera
            </button>
          </div>
        </div>
      )}

      {/* ROOM & RESIDENTS DETAIL MODAL (Detail Semua Teman Sekamar) */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                  <DoorOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-gray-900">
                    Kamar {detailTarget.nomor_kamar} &bull; {kosanNama}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Total {roomMates.length || 1} orang tinggal di kamar ini
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailTarget(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status Hubungan jika > 1 orang */}
            {detailTarget.hubungan && roomMates.length > 1 && (
              <div className="my-3.5 flex items-center justify-between rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs">
                <span className="text-amber-800 font-medium">Status Hubungan Penghuni:</span>
                <span className="font-bold text-amber-900 capitalize">
                  {detailTarget.hubungan === "suami_istri"
                    ? "Suami - Istri"
                    : detailTarget.hubungan === "saudara"
                    ? "Saudara Kandung / Family"
                    : detailTarget.hubungan === "teman"
                    ? "Teman / Rekan Kuliah"
                    : detailTarget.hubungan === "kerabat"
                    ? "Kerabat Satu Daerah"
                    : "Lainnya"}
                </span>
              </div>
            )}

            {/* List of All Roommates */}
            <div className="mt-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Daftar Penghuni di Kamar {detailTarget.nomor_kamar}:
              </h4>

              {roomMates.map((mate, idx) => {
                const isMale = mate.jenis_kelamin === "laki_laki";
                const cleanPhone = (mate.no_hp || "").replace(/\D/g, "");
                const waLink = `https://wa.me/${
                  cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone
                }`;

                const isPrimary = idx === 0;
                const roleLabel = isPrimary
                  ? "Penghuni Utama"
                  : detailTarget.hubungan === "suami_istri"
                  ? "Suami / Istri"
                  : detailTarget.hubungan === "saudara"
                  ? "Saudara / Family"
                  : detailTarget.hubungan === "teman"
                  ? "Teman"
                  : detailTarget.hubungan === "kerabat"
                  ? "Kerabat"
                  : "Rekan Sekamar";

                return (
                  <div
                    key={mate.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold shrink-0 ${
                            isMale
                              ? "bg-blue-100 text-blue-800"
                              : "bg-pink-100 text-pink-800"
                          }`}
                        >
                          {isMale ? "L" : "P"}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-heading font-bold text-gray-900 text-sm">
                              {mate.nama_lengkap}
                            </p>
                            <span
                              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${
                                isPrimary
                                  ? "bg-teal-50 text-teal-800 border-teal-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              {roleLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500">
                            {isMale ? "Laki-laki" : "Perempuan"} &bull; Asal: {mate.asal_daerah}
                          </p>
                        </div>
                      </div>

                      <span className="badge badge-success capitalize text-[10px] shrink-0">
                        {mate.status_pekerjaan}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-xs">
                      <span className="font-mono text-gray-600">{mate.no_hp}</span>
                      {mate.no_hp && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>Chat WA</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 border-t border-gray-100 pt-3">
              <button
                onClick={() => setDetailTarget(null)}
                className="btn-primary w-full text-xs py-2.5 bg-teal-600 hover:bg-teal-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
