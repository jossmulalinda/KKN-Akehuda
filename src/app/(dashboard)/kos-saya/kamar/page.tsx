"use client";

import { useState, useEffect, useRef } from "react";
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
  Eye,
  RotateCcw,
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Undo 10-Second State
  const [undoState, setUndoState] = useState<{
    type: "penghuni" | "kamar";
    penghuniId?: string;
    penghuniNama?: string;
    kamarId?: string;
    nomorKamar?: string;
    originalList: KamarItem[];
    countdown: number;
  } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const undoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Detail Modal state (Showing room with all its occupants)
  const [detailKamar, setDetailKamar] = useState<KamarItem | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    };
  }, []);

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

  // Start 10-Second Undo Countdown for Resident removal / Room emptying
  const startUndoDelete = (target: {
    type: "penghuni" | "kamar";
    penghuniId?: string;
    penghuniNama?: string;
    kamarId?: string;
    nomorKamar?: string;
  }) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);

    const prevList = JSON.parse(JSON.stringify(kamarList)) as KamarItem[];

    // Optimistically update kamarList in UI
    if (target.type === "penghuni" && target.penghuniId && target.kamarId) {
      setKamarList((prev) =>
        prev.map((k) => {
          if (k.id === target.kamarId) {
            const updatedPenghuni = k.penghuni.filter((p) => p.id !== target.penghuniId);
            return {
              ...k,
              penghuni: updatedPenghuni,
              jumlah_penghuni: updatedPenghuni.length,
              status: updatedPenghuni.length > 0 ? "aktif" : "kosong",
              hubungan: updatedPenghuni.length > 1 ? k.hubungan : null,
            };
          }
          return k;
        })
      );
    } else if (target.type === "kamar" && target.kamarId) {
      setKamarList((prev) =>
        prev.map((k) => {
          if (k.id === target.kamarId) {
            return {
              ...k,
              penghuni: [],
              jumlah_penghuni: 0,
              status: "kosong",
              hubungan: null,
            };
          }
          return k;
        })
      );
    }

    setDeleteModal({ isOpen: false, type: "penghuni" });

    setUndoState({
      ...target,
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
      const stateToExecute = { ...target };
      setUndoState(null);
      await executePermanentDelete(stateToExecute);
    }, 10000);
  };

  const handleUndo = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);

    if (undoState) {
      setKamarList(undoState.originalList);
    }
    setUndoState(null);
    setSuccessMsg("Penghapusan dibatalkan. Data tetap tersimpan.");
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleFinalizeDelete = async () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);

    if (undoState) {
      const stateToExecute = {
        type: undoState.type,
        penghuniId: undoState.penghuniId,
        penghuniNama: undoState.penghuniNama,
        kamarId: undoState.kamarId,
        nomorKamar: undoState.nomorKamar,
      };
      setUndoState(null);
      await executePermanentDelete(stateToExecute);
    }
  };

  // Execute permanent database deletion
  const executePermanentDelete = async (target: {
    type: "penghuni" | "kamar";
    penghuniId?: string;
    penghuniNama?: string;
    kamarId?: string;
    nomorKamar?: string;
  }) => {
    const supabase = createClient();

    try {
      if (target.type === "penghuni" && target.penghuniId && target.kamarId) {
        const { error: errDeletePenghuni } = await supabase
          .from("penghuni")
          .delete()
          .eq("id", target.penghuniId);

        if (errDeletePenghuni) throw errDeletePenghuni;

        const { data: remaining } = await supabase
          .from("penghuni")
          .select("id")
          .eq("kamar_id", target.kamarId);

        if (!remaining || remaining.length === 0) {
          await supabase
            .from("kamar")
            .update({ status: "kosong" as any, jumlah_penghuni: 0, hubungan: null })
            .eq("id", target.kamarId);
        } else {
          await supabase
            .from("kamar")
            .update({ jumlah_penghuni: remaining.length })
            .eq("id", target.kamarId);
        }

        setSuccessMsg(
          `Penghuni "${target.penghuniNama}" berhasil dikeluarkan permanen. Kamar ${target.nomorKamar} siap diisi kembali.`
        );
      } else if (target.type === "kamar" && target.kamarId) {
        await supabase
          .from("penghuni")
          .delete()
          .eq("kamar_id", target.kamarId);

        await supabase
          .from("kamar")
          .update({ status: "kosong" as any, jumlah_penghuni: 0, hubungan: null })
          .eq("id", target.kamarId);

        setSuccessMsg(
          `Kamar ${target.nomorKamar} berhasil dikosongkan permanen.`
        );
      }

      await fetchKamarData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      alert("Gagal memproses penghapusan: " + (err.message || "Terjadi kesalahan"));
      await fetchKamarData();
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
  const kamarTerisiCount = kamarList.filter((k) => k.status === "aktif" && k.penghuni.length > 0).length;
  const kamarKosongCount = Math.max(0, totalKamarCount - kamarTerisiCount);
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

      {/* Stats Cards (Clean Counts) */}
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
              <p className="text-xl font-bold text-gray-900">{kamarKosongCount}</p>
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
            const occupantsCount = kamar.penghuni?.length || 0;

            return (
              <div
                key={kamar.id}
                className={`card transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
                  isTerisi ? "border-teal-200 bg-white" : "border-gray-200 bg-gray-50/60"
                }`}
              >
                <div>
                  {/* Header Kamar */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-heading text-lg font-bold text-gray-900">
                          Kamar {kamar.nomor_kamar}
                        </h3>
                        {isTerisi && (
                          <span className="badge badge-info text-[10px]">
                            {occupantsCount === 1 ? "1 Orang" : `${occupantsCount} Orang`}
                          </span>
                        )}
                        {isTerisi && occupantsCount > 1 && kamar.hubungan && (
                          <span
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${
                              getHubunganBadge(kamar.hubungan).color
                            }`}
                          >
                            {getHubunganBadge(kamar.hubungan).label}
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
                      kamar.penghuni.map((p, pIdx) => {
                        const cleanPhone = p.no_hp.replace(/\D/g, "");
                        const waFormatted = cleanPhone.startsWith("0")
                          ? "62" + cleanPhone.slice(1)
                          : cleanPhone.startsWith("62")
                          ? cleanPhone
                          : "62" + cleanPhone;

                        const isMale = p.jenis_kelamin === "laki_laki";

                        const isPrimary = pIdx === 0;
                        const roleTag = isPrimary
                          ? "Utama"
                          : kamar.hubungan === "suami_istri"
                          ? "Suami/Istri"
                          : kamar.hubungan === "saudara"
                          ? "Family"
                          : kamar.hubungan === "teman"
                          ? "Teman"
                          : kamar.hubungan === "kerabat"
                          ? "Kerabat"
                          : "Rekan";

                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 p-2.5 hover:bg-teal-50/40 transition-colors"
                          >
                            <div
                              onClick={() => setDetailKamar(kamar)}
                              className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                            >
                              <span
                                className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold shrink-0 ${
                                  isMale
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-pink-100 text-pink-800"
                                }`}
                              >
                                {isMale ? "L" : "P"}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="truncate text-sm font-semibold text-gray-900 hover:text-teal-600">
                                    {p.nama_lengkap}
                                  </p>
                                  {occupantsCount > 1 && (
                                    <span
                                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold border ${
                                        isPrimary
                                          ? "bg-teal-50 text-teal-800 border-teal-200"
                                          : "bg-amber-50 text-amber-800 border-amber-200"
                                      }`}
                                    >
                                      {roleTag}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                  <span>{p.asal_daerah}</span>
                                  <span>&bull;</span>
                                  <span className="capitalize text-teal-700 font-medium">
                                    {p.status_pekerjaan}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
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
                                title="Keluarkan Penghuni"
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
                </div>

                {/* Footer Kamar */}
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
                  <button
                    onClick={() => setDetailKamar(kamar)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Lihat Detail Kamar</span>
                  </button>

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
                  Keluarkan penghuni <strong className="text-gray-900">{deleteModal.penghuniNama}</strong> dari{" "}
                  <strong>Kamar {deleteModal.nomorKamar}</strong>?
                </>
              ) : (
                <>
                  Kosongkan seluruh data penghuni di{" "}
                  <strong>Kamar {deleteModal.nomorKamar}</strong>?
                </>
              )}
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, type: "penghuni" })}
                className="btn-ghost flex-1 text-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => startUndoDelete(deleteModal)}
                className="btn-danger flex-1 text-sm bg-rose-600 hover:bg-rose-700"
              >
                {deleteModal.type === "penghuni" ? "Ya, Keluarkan" : "Ya, Kosongkan"}
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
              {undoState.type === "penghuni"
                ? undoState.penghuniNama
                : `Kamar ${undoState.nomorKamar}`}
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

      {/* ROOM & RESIDENTS DETAIL MODAL */}
      {detailKamar && (
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
                    Kamar {detailKamar.nomor_kamar} &bull; {detailKamar.kosan_nama}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Total {detailKamar.penghuni?.length || 0} orang tinggal di kamar ini
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailKamar(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status Hubungan jika > 1 orang */}
            {detailKamar.hubungan && detailKamar.penghuni.length > 1 && (
              <div className="my-3.5 flex items-center justify-between rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs">
                <span className="text-amber-800 font-medium">Status Hubungan Penghuni:</span>
                <span className="font-bold text-amber-900 capitalize">
                  {detailKamar.hubungan === "suami_istri"
                    ? "Suami - Istri"
                    : detailKamar.hubungan === "saudara"
                    ? "Saudara Kandung / Family"
                    : detailKamar.hubungan === "teman"
                    ? "Teman / Rekan Kuliah"
                    : detailKamar.hubungan === "kerabat"
                    ? "Kerabat Satu Daerah"
                    : "Lainnya"}
                </span>
              </div>
            )}

            {/* List of All Roommates */}
            <div className="mt-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Daftar Seluruh Penghuni Kamar:
              </h4>

              {detailKamar.penghuni && detailKamar.penghuni.length > 0 ? (
                detailKamar.penghuni.map((mate, idx) => {
                  const isMale = mate.jenis_kelamin === "laki_laki";
                  const cleanPhone = mate.no_hp.replace(/\D/g, "");
                  const waLink = `https://wa.me/${
                    cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone
                  }`;

                  const isPrimary = idx === 0;
                  const roleLabel = isPrimary
                    ? "Penghuni Utama"
                    : detailKamar.hubungan === "suami_istri"
                    ? "Suami / Istri"
                    : detailKamar.hubungan === "saudara"
                    ? "Saudara / Family"
                    : detailKamar.hubungan === "teman"
                    ? "Teman"
                    : detailKamar.hubungan === "kerabat"
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
                })
              ) : (
                <p className="text-xs text-gray-400 py-3 text-center">Kamar kosong</p>
              )}
            </div>

            <div className="mt-5 border-t border-gray-100 pt-3">
              <button
                onClick={() => setDetailKamar(null)}
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
