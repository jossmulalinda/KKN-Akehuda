"use client";

import { useState, useEffect, useRef } from "react";
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
  Users,
  DoorOpen,
  RotateCcw,
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
  kosan: { nama: string; kode_unik?: string } | null;
  kamar: { id: string; nomor_kamar: string; jumlah_penghuni: number; hubungan: string | null } | null;
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

export default function PenghuniPage() {
  const [penghuni, setPenghuni] = useState<PenghuniRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterKosan, setFilterKosan] = useState("semua");
  const [loading, setLoading] = useState(true);
  const [kosanList, setKosanList] = useState<{ id: string; nama: string; kode_unik?: string }[]>([]);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<PenghuniRow | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Undo 10-Second State
  const [undoState, setUndoState] = useState<{
    target: PenghuniRow;
    originalList: PenghuniRow[];
    countdown: number;
  } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const undoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Detail modal state
  const [detailPenghuni, setDetailPenghuni] = useState<PenghuniRow | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    };
  }, []);

  const fetchPenghuni = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("penghuni")
      .select(`
        *,
        kosan (id, nama, kode_unik),
        kamar (id, nomor_kamar, jumlah_penghuni, hubungan)
      `)
      .order("created_at", { ascending: false });

    if (data) {
      const rows = data as unknown as PenghuniRow[];
      setPenghuni(rows);

      // Extract unique kosans for filter
      const uniqueKosans: { id: string; nama: string; kode_unik?: string }[] = [];
      const seen = new Set<string>();
      rows.forEach((r) => {
        if (r.kosan && !seen.has(r.kosan_id)) {
          seen.add(r.kosan_id);
          uniqueKosans.push({
            id: r.kosan_id,
            nama: r.kosan.nama,
            kode_unik: r.kosan.kode_unik,
          });
        }
      });
      setKosanList(uniqueKosans);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPenghuni();
  }, []);

  const startUndoDelete = (target: PenghuniRow) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);

    const prevList = [...penghuni];
    // Optimistically remove from view
    setPenghuni((prev) => prev.filter((item) => item.id !== target.id));
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
      setPenghuni(undoState.originalList);
    }
    setUndoState(null);
    setSuccessMsg("Penghapusan dibatalkan. Data tetap tersimpan.");
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

  const executePermanentDelete = async (target: PenghuniRow) => {
    const supabase = createClient();
    try {
      const { error: errDelete } = await supabase
        .from("penghuni")
        .delete()
        .eq("id", target.id);

      if (errDelete) throw errDelete;

      if (target.kamar_id) {
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
      }

      setSuccessMsg(`Penghuni "${target.nama_lengkap}" telah dihapus permanen.`);
      await fetchPenghuni();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert("Gagal menghapus permanen: " + (err.message || "Terjadi kesalahan"));
      await fetchPenghuni();
    }
  };

  // Find all roommates for the selected detail resident
  const roomMates = detailPenghuni
    ? penghuni.filter((p) => p.kamar_id === detailPenghuni.kamar_id)
    : [];

  // Group all penghuni by kamar_id so each room is displayed as 1 clean row
  const groupedRooms = Object.values(
    penghuni.reduce((acc, p) => {
      const key = p.kamar_id || p.id;
      if (!acc[key]) {
        acc[key] = {
          kamarId: p.kamar_id,
          kosanId: p.kosan_id,
          kosan: p.kosan,
          kamar: p.kamar,
          primaryPenghuni: p,
          allPenghuni: [p],
        };
      } else {
        acc[key].allPenghuni.push(p);
      }
      return acc;
    }, {} as Record<string, {
      kamarId: string;
      kosanId: string;
      kosan: { nama: string; kode_unik?: string } | null;
      kamar: { id: string; nomor_kamar: string; jumlah_penghuni: number; hubungan: string | null } | null;
      primaryPenghuni: PenghuniRow;
      allPenghuni: PenghuniRow[];
    }>)
  );

  const filtered = groupedRooms.filter((room) => {
    const p = room.primaryPenghuni;
    const allNames = room.allPenghuni.map((m) => (m.nama_lengkap || "").toLowerCase()).join(" ");
    const allPhones = room.allPenghuni.map((m) => m.no_hp || "").join(" ");
    const allOrigins = room.allPenghuni.map((m) => (m.asal_daerah || "").toLowerCase()).join(" ");

    const matchSearch =
      allNames.includes(search.toLowerCase()) ||
      allOrigins.includes(search.toLowerCase()) ||
      (room.kosan?.nama || "").toLowerCase().includes(search.toLowerCase()) ||
      (room.kosan?.kode_unik || "").toLowerCase().includes(search.toLowerCase()) ||
      (room.kamar?.nomor_kamar || "").toLowerCase().includes(search.toLowerCase()) ||
      allPhones.includes(search);

    const matchStatus = filterStatus
      ? room.allPenghuni.some((m) => (m.status_pekerjaan || "").toLowerCase().includes(filterStatus.toLowerCase()))
      : true;

    const matchGender = filterGender
      ? room.allPenghuni.some((m) => m.jenis_kelamin === filterGender)
      : true;

    const matchKosan = filterKosan === "semua" || room.kosanId === filterKosan;

    return matchSearch && matchStatus && matchGender && matchKosan;
  });

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">
            Data Penghuni
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Daftar seluruh penghuni kos yang terdata di Kelurahan Akehuda
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
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama, kamar, kosan, no HP, atau asal..."
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
                {k.nama} {k.kode_unik ? `(#${k.kode_unik})` : ""}
              </option>
            ))}
          </select>
        )}

        <select
          value={filterGender}
          onChange={(e) => setFilterGender(e.target.value)}
          className="input-field w-full text-sm sm:w-36"
        >
          <option value="">Semua Gender</option>
          <option value="laki_laki">Laki-laki (L)</option>
          <option value="perempuan">Perempuan (P)</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-field w-full text-sm sm:w-40"
        >
          <option value="">Semua Status</option>
          <option value="mahasiswa">Mahasiswa</option>
          <option value="siswa">Siswa</option>
          <option value="pegawai">Pegawai</option>
          <option value="lainnya">Lainnya</option>
        </select>
      </div>

      {/* Stats */}
      <div className="mt-4 text-xs text-gray-500 font-medium">
        Menampilkan {filtered.length} kamar terisi ({penghuni.length} total penghuni terdaftar)
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
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
                Kosan & Kamar
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Penghuni Kamar
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Asal Daerah
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                No. WhatsApp
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
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                  Memuat data penghuni...
                </td>
              </tr>
            ) : filtered.length > 0 ? (
              filtered.map((room) => {
                const p = room.primaryPenghuni;
                const cleanPhone = (p.no_hp || "").replace(/\D/g, "");
                const waFormatted = cleanPhone.startsWith("0")
                  ? "62" + cleanPhone.slice(1)
                  : cleanPhone.startsWith("62")
                  ? cleanPhone
                  : "62" + cleanPhone;

                const countInRoom = room.allPenghuni.length;
                const roommates = room.allPenghuni.slice(1);

                return (
                  <tr key={room.kamarId || p.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div
                        onClick={() => setDetailPenghuni(p)}
                        className="cursor-pointer group"
                      >
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                          {p.nama_lengkap}
                        </p>
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-900">{room.kosan?.nama || "-"}</p>
                        {room.kosan?.kode_unik && (
                          <span className="text-[10px] font-mono font-bold text-gray-400">
                            #{room.kosan.kode_unik}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-teal-700 font-semibold">
                        Kamar {room.kamar?.nomor_kamar || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {countInRoom > 1 ? (
                        <div
                          onClick={() => setDetailPenghuni(p)}
                          className="cursor-pointer inline-flex flex-col gap-1 items-start group"
                          title="Klik untuk lihat rincian teman sekamar"
                        >
                          <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-800 border border-teal-200 group-hover:bg-teal-100 transition-colors">
                            <Users className="h-3 w-3 text-teal-600" />
                            {countInRoom} Orang
                          </span>
                          {room.kamar?.hubungan && (
                            <span
                              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${
                                getHubunganBadge(room.kamar.hubungan).color
                              }`}
                            >
                              {getHubunganBadge(room.kamar.hubungan).label}
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setDetailPenghuni(p)}
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
                <td colSpan={9} className="px-4 py-16 text-center">
                  <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4 text-gray-500 font-medium">Tidak ada data penghuni</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Data akan muncul saat penghuni mengisi formulir scan QR Code.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100">
                <AlertTriangle className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-gray-900">
                  Hapus Data Penghuni?
                </h3>
                <p className="text-xs text-rose-600">Data akan dihapus dari sistem kelurahan</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-600 leading-relaxed">
              Anda akan menghapus data penghuni:{" "}
              <strong className="text-gray-900">{deleteTarget.nama_lengkap}</strong> dari{" "}
              <strong>{deleteTarget.kosan?.nama || "Kosan"}</strong>,{" "}
              <strong>Kamar {deleteTarget.kamar?.nomor_kamar}</strong>.
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
                Ya, Hapus
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
              {undoState.target.nama_lengkap}
            </p>
            <p className="text-[11px] text-gray-400">
              Dihapus permanen dalam {undoState.countdown} detik...
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
              title="Hapus sekarang tanpa menunggu"
            >
              Hapus Segera
            </button>
          </div>
        </div>
      )}

      {/* ROOM & RESIDENTS DETAIL MODAL (Menampilkan seluruh penghuni di kamar) */}
      {detailPenghuni && (
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
                    Kamar {detailPenghuni.kamar?.nomor_kamar || "-"} &bull; {detailPenghuni.kosan?.nama}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Total {roomMates.length || 1} orang tinggal di kamar ini
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailPenghuni(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status Hubungan jika > 1 orang */}
            {detailPenghuni.kamar?.hubungan && roomMates.length > 1 && (
              <div className="my-3.5 flex items-center justify-between rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs">
                <span className="text-amber-800 font-medium">Status Hubungan Penghuni:</span>
                <span className="font-bold text-amber-900 capitalize">
                  {detailPenghuni.kamar.hubungan === "suami_istri"
                    ? "Suami - Istri"
                    : detailPenghuni.kamar.hubungan === "saudara"
                    ? "Saudara Kandung / Family"
                    : detailPenghuni.kamar.hubungan === "teman"
                    ? "Teman / Rekan Kuliah"
                    : detailPenghuni.kamar.hubungan === "kerabat"
                    ? "Kerabat Satu Daerah"
                    : "Lainnya"}
                </span>
              </div>
            )}

            {/* List of All Roommates */}
            <div className="mt-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Daftar Penghuni di Kamar {detailPenghuni.kamar?.nomor_kamar}:
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
                  : detailPenghuni.kamar?.hubungan === "suami_istri"
                  ? "Suami / Istri"
                  : detailPenghuni.kamar?.hubungan === "saudara"
                  ? "Saudara / Family"
                  : detailPenghuni.kamar?.hubungan === "teman"
                  ? "Teman"
                  : detailPenghuni.kamar?.hubungan === "kerabat"
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
                onClick={() => setDetailPenghuni(null)}
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
