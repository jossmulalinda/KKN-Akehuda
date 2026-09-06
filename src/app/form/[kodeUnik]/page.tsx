"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Phone,
  DoorOpen,
  Users,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertTriangle,
  Send,
  Building,
} from "lucide-react";

interface PenghuniItem {
  nama_lengkap: string;
  asal_daerah: string;
  jenis_kelamin: "laki_laki" | "perempuan" | "";
  no_hp: string;
  status_pekerjaan: string;
  status_custom: string;
}

const emptyPenghuni: PenghuniItem = {
  nama_lengkap: "",
  asal_daerah: "",
  jenis_kelamin: "",
  no_hp: "",
  status_pekerjaan: "mahasiswa",
  status_custom: "",
};

export default function FormPenghuniPage({
  params,
}: {
  params: Promise<{ kodeUnik: string }>;
}) {
  const { kodeUnik } = use(params);
  const [step, setStep] = useState(1);
  const [kosanInfo, setKosanInfo] = useState<{
    id: string;
    nama: string;
    alamat: string;
    kode_unik: string;
    kamar?: Array<{ id: string; nomor_kamar: string; status: string }>;
  } | null>(null);

  const [nomorKamar, setNomorKamar] = useState("");
  const [jumlahPenghuni, setJumlahPenghuni] = useState(1);
  const [hubungan, setHubungan] = useState("");
  const [penghuniList, setPenghuniList] = useState<PenghuniItem[]>([{ ...emptyPenghuni }]);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const fetchKosan = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("kosan")
      .select(`
        id,
        nama,
        alamat,
        kode_unik,
        kamar (
          id,
          nomor_kamar,
          status
        )
      `)
      .eq("kode_unik", kodeUnik)
      .maybeSingle();

    if (data) {
      setKosanInfo(data as any);
      setNotFound(false);
    } else {
      setNotFound(true);
    }
  };

  useEffect(() => {
    fetchKosan();
  }, [kodeUnik]);

  // Check if entered room number is already occupied
  const existingKamar = kosanInfo?.kamar || [];
  const normalizedInput = nomorKamar.trim().toLowerCase();
  const matchedKamar = existingKamar.find(
    (k) => k.nomor_kamar.trim().toLowerCase() === normalizedInput
  );
  const isRoomOccupied = matchedKamar && matchedKamar.status === "aktif";

  const updatePenghuni = (index: number, field: keyof PenghuniItem, value: any) => {
    const updated = [...penghuniList];
    (updated[index] as any)[field] = value;
    setPenghuniList(updated);
  };

  const handleJumlahChange = (val: number) => {
    setJumlahPenghuni(val);
    const currentList = [...penghuniList];
    while (currentList.length < val) {
      currentList.push({ ...emptyPenghuni });
    }
    setPenghuniList(currentList.slice(0, val));
    if (val <= 1) setHubungan("");
  };

  const validateStep1 = () => {
    if (!nomorKamar.trim()) return "Nomor kamar kos wajib diisi.";
    if (isRoomOccupied) {
      return `Kamar "${nomorKamar}" sudah terisi penghuni lain. Silakan periksa kembali nomor kamar Anda.`;
    }

    const p = penghuniList[0];
    if (!p.nama_lengkap.trim()) return "Nama lengkap penghuni wajib diisi.";
    if (!p.jenis_kelamin) return "Pilih jenis kelamin (Laki-laki / Perempuan).";
    if (!p.no_hp.trim()) return "Nomor HP / WhatsApp aktif wajib diisi.";
    if (!p.status_pekerjaan) return "Pilih status Anda (Mahasiswa / Siswa / Pegawai / Lainnya).";
    if (p.status_pekerjaan === "lainnya" && !p.status_custom.trim()) {
      return "Silakan tuliskan status pekerjaan Anda pada kolom yang tersedia.";
    }
    if (!p.asal_daerah.trim()) return "Asal daerah / kampung asal wajib diisi.";

    return null;
  };

  const validateAdditionalPenghuni = () => {
    for (let i = 1; i < penghuniList.length; i++) {
      const p = penghuniList[i];
      if (!p.nama_lengkap.trim()) return `Nama lengkap Penghuni #${i + 1} wajib diisi.`;
      if (!p.jenis_kelamin) return `Pilih jenis kelamin Penghuni #${i + 1}.`;
      if (!p.no_hp.trim()) return `Nomor HP / WhatsApp Penghuni #${i + 1} wajib diisi.`;
      if (!p.status_pekerjaan) return `Pilih status Penghuni #${i + 1}.`;
      if (p.status_pekerjaan === "lainnya" && !p.status_custom.trim()) {
        return `Silakan tuliskan status pekerjaan Penghuni #${i + 1}.`;
      }
    }
    return null;
  };

  const handleNextToStep2 = () => {
    const err = validateStep1();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmit = async () => {
    const step1Err = validateStep1();
    if (step1Err) {
      setError(step1Err);
      setStep(1);
      return;
    }

    if (jumlahPenghuni > 1) {
      const addErr = validateAdditionalPenghuni();
      if (addErr) {
        setError(addErr);
        return;
      }
    }

    if (isRoomOccupied) {
      setError(`Kamar ${nomorKamar} sudah terisi oleh penghuni lain.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      let targetKamarId: string;

      // 1. Check if room exists
      if (matchedKamar) {
        targetKamarId = matchedKamar.id;
        const { error: updateKamarError } = await supabase
          .from("kamar")
          .update({
            jumlah_penghuni: jumlahPenghuni,
            hubungan: (jumlahPenghuni > 1 ? hubungan : null) as any,
            status: "aktif",
          })
          .eq("id", targetKamarId);

        if (updateKamarError) throw updateKamarError;
      } else {
        const { data: newKamarData, error: newKamarError } = await supabase
          .from("kamar")
          .insert({
            nomor_kamar: nomorKamar.trim(),
            kosan_id: kosanInfo!.id,
            jumlah_penghuni: jumlahPenghuni,
            hubungan: (jumlahPenghuni > 1 ? hubungan : null) as any,
            status: "aktif",
          })
          .select()
          .single();

        if (newKamarError) throw newKamarError;
        targetKamarId = (newKamarData as any).id;
      }

      // 2. Direct database insert (No photo storage needed - saves 100% cloud quota)
      for (let i = 0; i < penghuniList.length; i++) {
        const p = penghuniList[i];
        const finalStatus =
          p.status_pekerjaan === "lainnya"
            ? p.status_custom.trim() || "Lainnya"
            : p.status_pekerjaan;

        const { error: penghuniError } = await supabase.from("penghuni").insert({
          kamar_id: targetKamarId,
          kosan_id: kosanInfo!.id,
          nama_lengkap: p.nama_lengkap.trim(),
          tempat_lahir: "-",
          tanggal_lahir: "2000-01-01",
          asal_daerah: p.asal_daerah.trim() || "-",
          jenis_kelamin: p.jenis_kelamin as "laki_laki" | "perempuan",
          no_hp: p.no_hp.trim(),
          status_pekerjaan: finalStatus as any,
          foto_url: null,
          is_primary: i === 0,
        });

        if (penghuniError) throw penghuniError;
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Gagal mengirim data. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Not found
  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-16 w-16 text-amber-500" />
          <h1 className="mt-4 font-heading text-2xl font-bold text-gray-900">
            Link Tidak Valid
          </h1>
          <p className="mt-2 text-gray-500 text-sm">
            Link form pendataan ini tidak ditemukan atau sudah tidak aktif.
          </p>
        </div>
      </div>
    );
  }

  // Loading
  if (!kosanInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400 text-sm">Memuat form pendataan...</div>
      </div>
    );
  }

  // Submitted success
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
        <div className="w-full max-w-md text-center">
          <div className="card shadow-lg p-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h1 className="mt-4 font-heading text-2xl font-bold text-gray-900">
              Data Berhasil Terkirim!
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Terima kasih telah mengisi data penghuni kos untuk{" "}
              <strong>{kosanInfo.nama}</strong>, Kamar <strong>{nomorKamar}</strong>.
            </p>
            <div className="mt-6 rounded-2xl bg-teal-50 p-4 text-left border border-teal-200">
              <p className="text-xs font-bold text-teal-900">
                Pemberitahuan Kelurahan Akehuda:
              </p>
              <p className="mt-1 text-xs text-teal-700 leading-relaxed">
                Data Anda telah resmi tercatat di database Kelurahan Akehuda untuk keperluan keamanan lingkungan dan ketertiban wilayah.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderPenghuniFields = (index: number, isAdditional: boolean = false) => {
    const p = penghuniList[index] || emptyPenghuni;

    return (
      <div className="space-y-4">
        {isAdditional && (
          <div className="rounded-xl bg-teal-50 p-3 border border-teal-200">
            <h3 className="font-heading text-xs font-bold text-teal-900 uppercase tracking-wider">
              Data Teman Sekamar (Penghuni #{index + 1})
            </h3>
          </div>
        )}

        {/* Nama Lengkap */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700">
            Nama Lengkap {isAdditional ? `(Penghuni #${index + 1})` : ""} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={p.nama_lengkap}
            onChange={(e) => updatePenghuni(index, "nama_lengkap", e.target.value)}
            className="input-field text-sm"
            placeholder="Sesuai kartu identitas asli"
            required
          />
        </div>

        {/* Jenis Kelamin (2 Opsi Jelas) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700">
            Jenis Kelamin <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => updatePenghuni(index, "jenis_kelamin", "laki_laki")}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                p.jenis_kelamin === "laki_laki"
                  ? "border-teal-600 bg-teal-50 text-teal-800 shadow-sm"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <span>👦 Laki-laki</span>
            </button>
            <button
              type="button"
              onClick={() => updatePenghuni(index, "jenis_kelamin", "perempuan")}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                p.jenis_kelamin === "perempuan"
                  ? "border-pink-500 bg-pink-50 text-pink-800 shadow-sm"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <span>👧 Perempuan</span>
            </button>
          </div>
        </div>

        {/* Status / Pekerjaan */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700">
            Status / Pekerjaan <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { key: "mahasiswa", label: "Mahasiswa" },
              { key: "siswa", label: "Siswa" },
              { key: "pegawai", label: "Pegawai" },
              { key: "lainnya", label: "Lainnya" },
            ].map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => updatePenghuni(index, "status_pekerjaan", st.key)}
                className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                  p.status_pekerjaan === st.key
                    ? "border-teal-600 bg-teal-600 text-white shadow-sm"
                    : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-white"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Jika pilih lainnya, bisa ketik sendiri */}
          {p.status_pekerjaan === "lainnya" && (
            <input
              type="text"
              value={p.status_custom}
              onChange={(e) => updatePenghuni(index, "status_custom", e.target.value)}
              className="input-field text-sm mt-2"
              placeholder="Tuliskan pekerjaan Anda (contoh: Wiraswasta, Guru, dll)"
              autoFocus
              required
            />
          )}
        </div>

        {/* No HP / WA */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700">
            Nomor HP / WhatsApp <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={p.no_hp}
            onChange={(e) => updatePenghuni(index, "no_hp", e.target.value)}
            className="input-field text-sm"
            placeholder="Contoh: 08xxxxxxxxxx"
            required
          />
        </div>

        {/* Asal Daerah */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700">
            Asal Daerah / Kampung Asal <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={p.asal_daerah}
            onChange={(e) => updatePenghuni(index, "asal_daerah", e.target.value)}
            className="input-field text-sm"
            placeholder="Contoh: Tidore, Sanana, Tobelo, Halbar, Ambon, dll"
            required
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-6 text-center">
          <img
            src="/favicon.png"
            alt="Logo SIKOSAN"
            className="mx-auto h-14 w-14 rounded-2xl object-contain shadow-sm"
          />
          <h1 className="mt-3 font-heading text-xl font-bold text-gray-900">
            Formulir Pendataan Penghuni
          </h1>
          <div className="mt-1 flex items-center justify-center gap-2 text-xs text-gray-600">
            <Building className="h-3.5 w-3.5 text-teal-600" />
            <span className="font-semibold">{kosanInfo.nama}</span>
            <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-teal-800">
              #{kosanInfo.kode_unik}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">{kosanInfo.alamat}</p>
        </div>

        {/* Form Card */}
        <div className="card shadow-md p-6">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Nomor Kamar, Jumlah Orang & Data Diri Utama */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Nomor Kamar */}
              <div className="space-y-1.5 rounded-2xl bg-teal-50/70 p-4 border border-teal-200">
                <label className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                  <DoorOpen className="h-4 w-4 text-teal-700" />
                  <span>Nomor Kamar Kos <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="text"
                  value={nomorKamar}
                  onChange={(e) => {
                    setNomorKamar(e.target.value);
                    setError(null);
                  }}
                  className={`input-field text-sm font-bold ${
                    isRoomOccupied ? "border-red-500 bg-red-50 text-red-900" : "bg-white"
                  }`}
                  placeholder="Contoh: 01, Kamar 3, A2, dll"
                  required
                />

                {isRoomOccupied && (
                  <p className="text-xs text-red-600 font-semibold mt-1">
                    ⚠️ Kamar {nomorKamar} sudah terisi oleh penghuni lain.
                  </p>
                )}

                {!isRoomOccupied && nomorKamar.trim() && (
                  <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Kamar {nomorKamar} siap didaftarkan</span>
                  </p>
                )}
              </div>

              {/* Berapa Orang di Kamar */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-teal-600" />
                  <span>Berapa orang yang tinggal di Kamar {nomorKamar || "ini"}?</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleJumlahChange(num)}
                      className={`rounded-xl border-2 py-3 text-center text-sm font-bold transition-all ${
                        jumlahPenghuni === num
                          ? "border-teal-600 bg-teal-50 text-teal-800 shadow-sm"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {num} <span className="text-xs font-normal">orang</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Hubungan jika > 1 orang */}
              {jumlahPenghuni > 1 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    Status Hubungan Antar Penghuni Kamar <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={hubungan}
                    onChange={(e) => setHubungan(e.target.value)}
                    className="input-field text-sm"
                    required
                  >
                    <option value="">Pilih status hubungan</option>
                    <option value="suami_istri">Suami - Istri</option>
                    <option value="saudara">Saudara Kandung / Family</option>
                    <option value="teman">Teman / Rekan Kuliah</option>
                    <option value="kerabat">Kerabat Satu Daerah</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>
              )}

              {/* Data Diri Penghuni Utama */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="font-heading text-sm font-bold text-gray-900 mb-3">
                  Data Diri Penghuni Utama
                </h3>
                {renderPenghuniFields(0)}
              </div>

              {jumlahPenghuni > 1 ? (
                <button
                  type="button"
                  onClick={handleNextToStep2}
                  disabled={isRoomOccupied}
                  className="btn-primary w-full py-3 text-sm font-semibold bg-teal-600 hover:bg-teal-700 shadow-sm"
                >
                  <span className="flex items-center justify-center gap-2">
                    Lanjut Isi Data Teman Sekamar ({jumlahPenghuni - 1} Orang) <ChevronRight className="h-4 w-4" />
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || isRoomOccupied}
                  className="btn-primary w-full py-3 text-sm font-semibold bg-teal-600 hover:bg-teal-700 shadow-sm"
                >
                  <span className="flex items-center justify-center gap-2">
                    {loading ? "Mengirim Data..." : "Kirim Data Pendaftaran"} <Send className="h-4 w-4" />
                  </span>
                </button>
              )}
            </div>
          )}

          {/* STEP 2: Data Teman Sekamar (jika > 1 orang) */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h2 className="font-heading text-base font-bold text-gray-900">
                    Data Teman Sekamar (Kamar {nomorKamar})
                  </h2>
                  <p className="text-xs text-gray-500">
                    Lengkapi data {jumlahPenghuni - 1} teman sekamar Anda
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {penghuniList.slice(1).map((_, i) => (
                  <div key={i + 1} className="border-t border-gray-100 pt-4 first:border-0 first:pt-0">
                    {renderPenghuniFields(i + 1, true)}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary flex-1 text-xs py-2.5"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Kembali
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-primary flex-1 text-xs py-2.5 bg-teal-600 hover:bg-teal-700 shadow-sm"
                >
                  {loading ? "Menyimpan Data..." : "Kirim Semua Data Penghuni"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-gray-400">
          &copy; {new Date().getFullYear()} SIKOSAN — Kelurahan Akehuda, Kota Ternate
        </p>
      </div>
    </div>
  );
}
