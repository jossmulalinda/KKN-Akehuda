"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateKodeUnik } from "@/lib/utils";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { MapPicker } from "@/components/map-picker";
import type { Profile } from "@/lib/types/database";

export default function TambahKosanPage() {
  const [nama, setNama] = useState("");
  const [alamat, setAlamat] = useState("");
  const [pemilikId, setPemilikId] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 0.8228,
    lng: 127.3789,
  });
  const [pemilikList, setPemilikList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPemilik = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "admin_kos")
        .order("full_name");
      if (data) setPemilikList(data as Profile[]);
    };
    fetchPemilik();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.from("kosan").insert({
        nama,
        alamat,
        pemilik_id: pemilikId,
        kode_unik: generateKodeUnik(),
        latitude: coords.lat,
        longitude: coords.lng,
      });

      if (error) throw error;
      router.push("/kosan");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Gagal menambahkan kosan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/kosan"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Kosan
        </Link>
      </div>

      <div className="card">
        <h1 className="font-heading text-2xl font-bold text-gray-900">
          Tambah Kosan Baru
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Daftarkan kosan baru ke dalam sistem Kelurahan Akehuda
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Nama Kosan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="input-field"
              placeholder="Contoh: Kos Melati"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Alamat Tertulis <span className="text-red-500">*</span>
            </label>
            <textarea
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              className="input-field min-h-[80px] resize-none"
              placeholder="Contoh: Jl. Sultan Babullah No. 12, RT 02 / RW 01, Akehuda"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Pemilik Kos <span className="text-red-500">*</span>
            </label>
            <select
              value={pemilikId}
              onChange={(e) => setPemilikId(e.target.value)}
              className="input-field"
              required
            >
              <option value="">Pilih pemilik kos</option>
              {pemilikList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} {p.phone ? `(${p.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Map Picker */}
          <div className="space-y-1.5 border-t border-gray-100 pt-4">
            <label className="text-sm font-medium text-gray-700">
              Titik Lokasi Peta (Kelurahan Akehuda)
            </label>
            <MapPicker
              initialLat={coords.lat}
              initialLng={coords.lng}
              onChange={(c) => setCoords(c)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Link href="/kosan" className="btn-secondary flex-1">
              Batal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Menyimpan...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  <span>Simpan Kosan</span>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
