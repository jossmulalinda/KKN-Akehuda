"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Plus, Search, Home, MapPin, Users, ExternalLink, X, Navigation } from "lucide-react";
import { MapView, type KosanMapItem } from "@/components/map-view";

export default function KosanPage() {
  const [kosanList, setKosanList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedKosanId, setSelectedKosanId] = useState<string | null>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchKosan = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("kosan")
        .select(`
          *,
          profiles!pemilik_id (full_name, phone),
          kamar (
            id,
            status,
            penghuni (id)
          )
        `)
        .order("created_at", { ascending: false });

      if (data) setKosanList(data);
      setLoading(false);
    };

    fetchKosan();
  }, []);

  const filtered = kosanList.filter((k) =>
    (k.nama || "").toLowerCase().includes(search.toLowerCase()) ||
    (k.alamat || "").toLowerCase().includes(search.toLowerCase()) ||
    (k.profiles?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (k.kode_unik || "").toLowerCase().includes(search.toLowerCase())
  );

  const mapItems: KosanMapItem[] = filtered.map((k) => {
    const totalPenghuni = k.kamar?.reduce(
      (sum: number, km: any) => sum + (km.penghuni?.length || 0),
      0
    ) || 0;

    return {
      id: k.id,
      nama: k.nama,
      alamat: k.alamat,
      latitude: k.latitude,
      longitude: k.longitude,
      pemilik_name: k.profiles?.full_name,
      kode_unik: k.kode_unik,
      total_kamar: k.kamar?.length || 0,
      total_penghuni: totalPenghuni,
    };
  });

  const handleFocusOnMap = (kosanId: string) => {
    setSelectedKosanId(kosanId);
    if (mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSelectFromMap = (kosanId: string) => {
    setSelectedKosanId(kosanId);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">
            Daftar & Peta Kosan
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitoring, pencarian, dan pemetaan sebaran kosan di Kelurahan Akehuda
          </p>
        </div>
        <Link href="/kosan/tambah" className="btn-primary shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Tambah Kosan Baru
        </Link>
      </div>

      {/* Search Bar (Controls both Map & Cards) */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Cari nama kosan, kode unik, alamat, atau nama pemilik..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedKosanId(null);
          }}
          className="input-field pl-10 pr-10 text-sm font-medium"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 1. SECTION PETA KOSAN (BAGIAN ATAS) */}
      <div ref={mapSectionRef} className="card p-4 sm:p-6 shadow-sm border border-gray-200">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="font-heading text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>Peta Sebaran Titik Kosan</span>
              <span className="text-xs font-normal text-gray-500">
                (Akehuda, Ternate)
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Klik pin pada peta untuk melihat data kosan atau klik tombol kartu di bawah untuk menyorot lokasinya.
            </p>
          </div>
          {selectedKosanId && (
            <button
              onClick={() => setSelectedKosanId(null)}
              className="text-xs text-teal-700 hover:text-teal-800 font-semibold self-start sm:self-auto bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200"
            >
              Reset Sorotan Peta
            </button>
          )}
        </div>

        {loading ? (
          <div className="aspect-square md:aspect-auto md:h-[480px] flex items-center justify-center bg-gray-50 rounded-2xl text-gray-400 text-sm">
            Memuat peta...
          </div>
        ) : (
          <MapView
            kosanList={mapItems}
            selectedKosanId={selectedKosanId}
            onSelectKosan={handleSelectFromMap}
            searchQuery={search}
            heightClass="aspect-square md:aspect-auto md:h-[480px]"
          />
        )}
      </div>

      {/* 2. SECTION DAFTAR KARTU KOSAN (BAGIAN BAWAH) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-gray-900">
            Daftar Seluruh Kosan
          </h2>
          <span className="text-xs font-medium text-gray-500">
            Menampilkan {filtered.length} dari {kosanList.length} kosan
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="card animate-pulse p-6">
                <div className="h-6 w-1/3 rounded bg-gray-200" />
                <div className="mt-4 h-24 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((kosan) => {
              const totalPenghuni = kosan.kamar?.reduce(
                (sum: number, km: any) => sum + (km.penghuni?.length || 0),
                0
              ) || 0;
              const kamarTerisi = kosan.kamar?.filter(
                (km: any) => km.status === "aktif"
              ).length || 0;

              const hasCoords = kosan.latitude !== null && kosan.longitude !== null && !isNaN(kosan.latitude);
              const isSelected = selectedKosanId === kosan.id;

              return (
                <div
                  id={`kosan-card-${kosan.id}`}
                  key={kosan.id}
                  className={`card transition-all duration-300 flex flex-col justify-between ${
                    isSelected
                      ? "ring-2 ring-teal-500 border-teal-500 bg-teal-50/20 shadow-md scale-[1.01]"
                      : "hover:shadow-md border-gray-200"
                  }`}
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                        <Home className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasCoords ? (
                          <button
                            onClick={() => handleFocusOnMap(kosan.id)}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                            title="Klik untuk sorot titik di peta"
                          >
                            <Navigation className="h-3 w-3 text-emerald-600" />
                            <span>Lihat di Peta</span>
                          </button>
                        ) : (
                          <span className="badge badge-neutral text-[10px]">
                            Belum Ada Titik
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Kosan Title & Code */}
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <h3 className="font-heading text-lg font-bold text-gray-900 truncate">
                        {kosan.nama}
                      </h3>
                      {kosan.kode_unik && (
                        <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-mono font-bold text-teal-800 border border-teal-200 shrink-0">
                          #{kosan.kode_unik}
                        </span>
                      )}
                    </div>

                    {/* Alamat & Pemilik */}
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="truncate">{kosan.alamat}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                      <Users className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span>Pemilik: <strong className="text-gray-700">{kosan.profiles?.full_name || "-"}</strong></span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                      <span>🚪 {kosan.kamar?.length || 0} Kamar ({kamarTerisi} Terisi)</span>
                      <span>👥 {totalPenghuni} Penghuni</span>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between">
                      {hasCoords ? (
                        <button
                          onClick={() => handleFocusOnMap(kosan.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline"
                        >
                          <Navigation className="h-3 w-3" />
                          <span>Sorot Peta</span>
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                      <Link
                        href={`/kosan/${kosan.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline"
                      >
                        <span>Lihat Detail</span>
                        <span>&rarr;</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card py-16 text-center">
            <Home className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 font-heading text-base font-semibold text-gray-900">
              Tidak ada kosan ditemukan
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Coba gunakan kata kunci pencarian yang lain.
            </p>
            <button
              onClick={() => setSearch("")}
              className="btn-secondary mt-4 inline-flex text-xs"
            >
              Reset Pencarian
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
