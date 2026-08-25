"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  MapPin,
  Phone,
  Camera,
  Users,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertTriangle,
  DoorOpen,
  Info,
} from "lucide-react";

interface PenghuniData {
  nama_lengkap: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  asal_daerah: string;
  jenis_kelamin: string;
  no_hp: string;
  status_pekerjaan: string;
  foto: File | null;
  foto_preview: string | null;
}

const emptyPenghuni: PenghuniData = {
  nama_lengkap: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  asal_daerah: "",
  jenis_kelamin: "",
  no_hp: "",
  status_pekerjaan: "",
  foto: null,
  foto_preview: null,
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
    kamar?: Array<{ id: string; nomor_kamar: string; status: string }>;
  } | null>(null);
  const [nomorKamar, setNomorKamar] = useState("");
  const [jumlahPenghuni, setJumlahPenghuni] = useState(1);
  const [hubungan, setHubungan] = useState("");
  const [penghuniList, setPenghuniList] = useState<PenghuniData[]>([{ ...emptyPenghuni }]);
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

  const updatePenghuni = (index: number, field: keyof PenghuniData, value: any) => {
    const updated = [...penghuniList];
    (updated[index] as any)[field] = value;
    setPenghuniList(updated);
  };

  const handleFotoChange = (index: number, file: File | null) => {
    if (!file) return;
    const updated = [...penghuniList];
    updated[index].foto = file;
    updated[index].foto_preview = URL.createObjectURL(file);
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
    const p = penghuniList[0];
    if (!p.nama_lengkap.trim()) return "Nama lengkap penghuni pertama wajib diisi.";
    if (!p.tempat_lahir.trim()) return "Tempat lahir wajib diisi.";
    if (!p.tanggal_lahir) return "Tanggal lahir wajib diisi.";
    if (!p.asal_daerah.trim()) return "Asal daerah / kampung asal wajib diisi.";
    if (!p.jenis_kelamin) return "Jenis kelamin wajib dipilih.";
    if (!p.no_hp.trim()) return "Nomor HP / WhatsApp aktif wajib diisi.";
    if (!p.status_pekerjaan) return "Status pekerjaan / kuliah wajib dipilih.";
    if (!nomorKamar.trim()) return "Nomor kamar kos wajib diisi.";
    if (isRoomOccupied) return `Kamar "${nomorKamar}" sudah terdaftar dan terisi. Silakan pilih nomor kamar Anda yang benar.`;
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
        // Room exists and is empty: update to active
        targetKamarId = matchedKamar.id;
        const { error: updateKamarError } = await supabase
          .from("kamar")
          .update({
            jumlah_penghuni: jumlahPenghuni,
            hubungan: jumlahPenghuni > 1 ? hubungan : null,
            status: "aktif",
          })
          .eq("id", targetKamarId);

        if (updateKamarError) throw updateKamarError;
      } else {
        // Create new room
        const { data: newKamarData, error: newKamarError } = await supabase
          .from("kamar")
          .insert({
            nomor_kamar: nomorKamar.trim(),
            kosan_id: kosanInfo!.id,
            jumlah_penghuni: jumlahPenghuni,
            hubungan: jumlahPenghuni > 1 ? hubungan : null,
            status: "aktif",
          })
          .select()
          .single();

        if (newKamarError) throw newKamarError;
        targetKamarId = (newKamarData as any).id;
      }

      // 2. Upload photos & insert penghuni
      for (let i = 0; i < penghuniList.length; i++) {
        const p = penghuniList[i];
        let fotoUrl: string | null = null;

        // Upload foto if exists
        if (p.foto) {
          const ext = p.foto.name.split(".").pop() || "jpg";
          const fileName = `${targetKamarId}-${i}-${Date.now()}.${ext}`;
          const { data: uploadData } = await supabase.storage
            .from("foto-penghuni")
            .upload(fileName, p.foto);

          if (uploadData) {
            const { data: urlData } = supabase.storage
              .from("foto-penghuni")
              .getPublicUrl(uploadData.path);
            fotoUrl = urlData.publicUrl;
          }
        }

        // Insert penghuni
        const { error: penghuniError } = await supabase.from("penghuni").insert({
          kamar_id: targetKamarId,
          kosan_id: kosanInfo!.id,
          nama_lengkap: p.nama_lengkap.trim(),
          tempat_lahir: p.tempat_lahir.trim(),
          tanggal_lahir: p.tanggal_lahir,
          asal_daerah: p.asal_daerah.trim(),
          jenis_kelamin: p.jenis_kelamin as "laki_laki" | "perempuan",
          no_hp: p.no_hp.trim(),
          status_pekerjaan: p.status_pekerjaan as "mahasiswa" | "pekerja" | "lainnya",
          foto_url: fotoUrl,
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
          <p className="mt-2 text-gray-500">
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
        <div className="text-center text-gray-400">Memuat form pendataan...</div>
      </div>
    );
  }

  // Submitted success
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
        <div className="w-full max-w-md text-center">
          <div className="card">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h1 className="mt-4 font-heading text-2xl font-bold text-gray-900">
              Data Berhasil Terkirim!
            </h1>
            <p className="mt-2 text-gray-500">
              Terima kasih telah mengisi data penghuni kos untuk{" "}
              <strong>{kosanInfo.nama}</strong>, Kamar <strong>{nomorKamar}</strong>.
            </p>
            <div className="mt-6 rounded-xl bg-primary-50 p-4 text-left">
              <p className="text-sm font-medium text-primary-900">
                Pemberitahuan Kelurahan Akehuda
              </p>
              <p className="mt-1 text-xs text-primary-700">
                Data Anda telah resmi tercatat di database Kelurahan Akehuda.
                Data ini bersifat rahasia dan hanya digunakan untuk keperluan
                pendataan dan keamanan lingkungan kelurahan.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalSteps = jumlahPenghuni > 1 ? 3 : 2;

  // Render individual penghuni form
  const renderPenghuniForm = (index: number, isAdditional: boolean = false) => {
    const p = penghuniList[index] || emptyPenghuni;

    return (
      <div className="space-y-4">
        {isAdditional && (
          <div className="rounded-lg bg-gray-50 p-3">
            <h3 className="font-heading text-sm font-semibold text-gray-700">
              Penghuni #{index + 1}
            </h3>
          </div>
        )}

        {/* Foto Selfie */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Foto Selfie / Pas Foto {isAdditional ? `(Penghuni #${index + 1})` : ""}
          </label>
          <div className="flex items-center gap-4">
            {p.foto_preview ? (
              <img
                src={p.foto_preview}
                alt="Preview"
                className="h-20 w-20 rounded-xl object-cover border-2 border-primary-500"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100 text-gray-400 border border-gray-200">
                <Camera className="h-8 w-8" />
              </div>
            )}
            <div>
              <label className="btn-secondary cursor-pointer text-sm">
                <Camera className="mr-1.5 h-4 w-4" />
                <span>{p.foto_preview ? "Ganti Foto" : "Ambil / Pilih Foto"}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={(e) =>
                    handleFotoChange(index, e.target.files?.[0] || null)
                  }
                  className="hidden"
                />
              </label>
              <p className="mt-1 text-xs text-gray-400">
                Format: JPG, PNG (Maks 10MB)
              </p>
            </div>
          </div>
        </div>

        {/* Nama Lengkap */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Nama Lengkap <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={p.nama_lengkap}
            onChange={(e) =>
              updatePenghuni(index, "nama_lengkap", e.target.value)
            }
            className="input-field"
            placeholder="Sesuai identitas asli"
            required
          />
        </div>

        {/* Tempat & Tanggal Lahir */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Tempat Lahir <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={p.tempat_lahir}
              onChange={(e) =>
                updatePenghuni(index, "tempat_lahir", e.target.value)
              }
              className="input-field"
              placeholder="Contoh: Ternate"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Tanggal Lahir <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={p.tanggal_lahir}
              onChange={(e) =>
                updatePenghuni(index, "tanggal_lahir", e.target.value)
              }
              className="input-field"
              required
            />
          </div>
        </div>

        {/* Asal Daerah */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Asal Daerah / Kampung Asal <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={p.asal_daerah}
            onChange={(e) =>
              updatePenghuni(index, "asal_daerah", e.target.value)
            }
            className="input-field"
            placeholder="Contoh: Tidore, Tobelo, Sanana, Ambon, dll"
            required
          />
        </div>

        {/* Jenis Kelamin & Status */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Jenis Kelamin <span className="text-red-500">*</span>
            </label>
            <select
              value={p.jenis_kelamin}
              onChange={(e) =>
                updatePenghuni(index, "jenis_kelamin", e.target.value)
              }
              className="input-field"
              required
            >
              <option value="">Pilih jenis kelamin</option>
              <option value="laki_laki">Laki-laki</option>
              <option value="perempuan">Perempuan</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Status / Pekerjaan <span className="text-red-500">*</span>
            </label>
            <select
              value={p.status_pekerjaan}
              onChange={(e) =>
                updatePenghuni(index, "status_pekerjaan", e.target.value)
              }
              className="input-field"
              required
            >
              <option value="">Pilih status</option>
              <option value="mahasiswa">Mahasiswa / Pelajar</option>
              <option value="pekerja">Pekerja / Karyawan</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>
        </div>

        {/* No HP */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Nomor HP / WhatsApp <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={p.no_hp}
            onChange={(e) => updatePenghuni(index, "no_hp", e.target.value)}
            className="input-field"
            placeholder="08xxxxxxxxxx"
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
            className="mx-auto h-16 w-16 rounded-2xl object-contain shadow-sm"
          />
          <h1 className="mt-3 font-heading text-xl font-bold text-gray-900">
            Form Pendataan Penghuni
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {kosanInfo.nama} — {kosanInfo.alamat}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  i + 1 <= step
                    ? "bg-primary-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {i + 1}
              </div>
              {i < totalSteps - 1 && (
                <div
                  className={`h-1 w-8 rounded-full ${
                    i + 1 < step ? "bg-primary-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="card">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Data penghuni utama & Nomor Kamar */}
          {step === 1 && (
            <div>
              <h2 className="font-heading text-lg font-semibold text-gray-900">
                Data Diri Penghuni Utama
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Isi data diri Anda dengan lengkap dan benar
              </p>

              <div className="mt-6">{renderPenghuniForm(0)}</div>

              {/* Input Nomor Kamar */}
              <div className="mt-6 border-t border-gray-100 pt-5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <DoorOpen className="h-4 w-4 text-primary-600" />
                      <span>Nomor Kamar Kos <span className="text-red-500">*</span></span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={nomorKamar}
                    onChange={(e) => {
                      setNomorKamar(e.target.value);
                      setError(null);
                    }}
                    className={`input-field ${
                      isRoomOccupied ? "border-red-500 bg-red-50 text-red-900" : ""
                    }`}
                    placeholder="Contoh: 01, A3, Kamar 5, dll"
                    required
                  />

                  {/* Warning jika kamar sudah terisi */}
                  {isRoomOccupied && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 mt-2 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-semibold">Kamar {nomorKamar} Sudah Terisi!</p>
                        <p className="mt-0.5 text-red-600">
                          Kamar ini sudah terdaftar dan dihuni. Penghuni baru tidak dapat memasukkan data pada kamar yang sama. Silakan pastikan kembali nomor kamar Anda.
                        </p>
                      </div>
                    </div>
                  )}

                  {!isRoomOccupied && nomorKamar.trim() && (
                    <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Kamar {nomorKamar} tersedia untuk didaftarkan</span>
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handleNextToStep2}
                disabled={isRoomOccupied}
                className="btn-primary mt-6 w-full py-3 text-base"
              >
                <span className="flex items-center justify-center gap-2">
                  Selanjutnya <ChevronRight className="h-5 w-5" />
                </span>
              </button>
            </div>
          )}

          {/* Step 2: Jumlah penghuni */}
          {step === 2 && (
            <div>
              <h2 className="font-heading text-lg font-semibold text-gray-900">
                Info Kamar {nomorKamar}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Berapa orang yang tinggal di Kamar {nomorKamar}?
              </p>

              <div className="mt-6">
                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleJumlahChange(num)}
                      className={`rounded-xl border-2 py-4 text-center text-lg font-semibold transition-all ${
                        jumlahPenghuni === num
                          ? "border-primary-600 bg-primary-50 text-primary-600"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {num}
                      <span className="block text-xs font-normal text-gray-400">
                        orang
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hubungan (muncul jika > 1 orang) */}
              {jumlahPenghuni > 1 && (
                <div className="mt-6 space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Status Hubungan Antar Penghuni Kamar <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={hubungan}
                    onChange={(e) => setHubungan(e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">Pilih status hubungan</option>
                    <option value="suami_istri">Suami - Istri</option>
                    <option value="saudara">Saudara Kandung / Famili</option>
                    <option value="teman">Teman / Rekan Kuliah</option>
                    <option value="kerabat">Kerabat Satu Daerah</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Sesuai arahan Kelurahan Akehuda, status hubungan wajib diisi untuk verifikasi ketertiban lingkungan.
                  </p>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="btn-secondary flex-1"
                >
                  <ChevronLeft className="mr-1 h-5 w-5" />
                  Kembali
                </button>
                {jumlahPenghuni > 1 ? (
                  <button
                    onClick={() => {
                      if (!hubungan) {
                        setError("Silakan pilih status hubungan antar penghuni kamar.");
                        return;
                      }
                      setError(null);
                      setStep(3);
                    }}
                    className="btn-primary flex-1"
                  >
                    Lanjut Isi Data Teman Kamar <ChevronRight className="ml-1 h-5 w-5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="btn-primary flex-1"
                  >
                    {loading ? "Mengirim Data..." : "Kirim Data Sekarang"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Data penghuni tambahan (jika > 1) */}
          {step === 3 && (
            <div>
              <h2 className="font-heading text-lg font-semibold text-gray-900">
                Data Penghuni Tambahan
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Lengkapi data untuk teman sekamar di Kamar {nomorKamar}
              </p>

              <div className="mt-6 space-y-6">
                {penghuniList.slice(1).map((_, i) => (
                  <div key={i + 1} className="border-t border-gray-100 pt-4 first:border-0 first:pt-0">
                    {renderPenghuniForm(i + 1, true)}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="btn-secondary flex-1"
                >
                  <ChevronLeft className="mr-1 h-5 w-5" />
                  Kembali
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? "Mengirim Data..." : "Kirim Semua Data"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} SIKOSAN — Kelurahan Akehuda, Kota Ternate
        </p>
      </div>
    </div>
  );
}
