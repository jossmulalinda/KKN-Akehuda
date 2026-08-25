"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Plus, Search, Home, MapPin, Users, LayoutGrid, Map, ExternalLink } from "lucide-react";
import { MapView, type KosanMapItem } from "@/components/map-view";

export default function KosanPage() {
  const [kosanList, setKosanList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

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
    k.nama.toLowerCase().includes(search.toLowerCase()) ||
    k.alamat.toLowerCase().includes(search.toLowerCase()) ||
    k.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
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
      total_kamar: k.kamar?.length || 0,
      total_penghuni: totalPenghuni,
    };
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">
            Daftar Kosan
          </h1>
          <p className="mt-1 text-gray-500">
            Monitoring & pemetaan seluruh kosan di wilayah Kelurahan Akehuda
          </p>
        </div>
        <Link href="/kosan/tambah" className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          Tambah Kosan Baru
        </Link>
      </div>

      {/* Controls: Search & View Mode Switcher */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama kosan, alamat, atau pemilik..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setViewMode("grid")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              viewMode === "grid"
                ? "bg-primary-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Daftar Kartu</span>
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              viewMode === "map"
                ? "bg-primary-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Map className="h-4 w-4" />
            <span>Peta Sebaran Kosan</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6">
        {loading ? (
          <div className="py-20 text-center text-gray-400">
            Memuat data kosan...
          </div>
        ) : viewMode === "map" ? (
          <div className="card">
            <div className="mb-4">
              <h2 className="font-heading text-lg font-semibold text-gray-900">
                Peta Titik Lokasi Kosan — Kelurahan Akehuda
              </h2>
              <p className="text-xs text-gray-500">
                Klik pin marker pada peta untuk melihat informasi kosan dan petunjuk arah.
              </p>
            </div>
            <MapView kosanList={mapItems} heightClass="h-[520px]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.length > 0 ? (
              filtered.map((kosan) => {
                const totalPenghuni = kosan.kamar?.reduce(
                  (sum: number, km: any) => sum + (km.penghuni?.length || 0),
                  0
                ) || 0;
                const kamarTerisi = kosan.kamar?.filter(
                  (km: any) => km.status === "aktif"
                ).length || 0;

                return (
                  <Link
                    key={kosan.id}
                    href={`/kosan/${kosan.id}`}
                    className="card hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                          <Home className="h-5 w-5" />
                        </div>
                        {kosan.latitude && kosan.longitude ? (
                          <span className="badge badge-success">📍 Ada di Peta</span>
                        ) : (
                          <span className="badge badge-neutral">Belum Ada Titik</span>
                        )}
                      </div>
                      <h3 className="mt-4 font-heading text-lg font-semibold text-gray-900">
                        {kosan.nama}
                      </h3>
                      <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
                        <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="truncate">{kosan.alamat}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                        <Users className="h-4 w-4 shrink-0 text-gray-400" />
                        <span>Pemilik: <strong>{kosan.profiles?.full_name || "-"}</strong></span>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>🚪 {kosan.kamar?.length || 0} Kamar ({kamarTerisi} Terisi)</span>
                        <span>👥 {totalPenghuni} Penghuni</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 bg-teal-50 px-2 py-1 rounded-md">
                          <QrCode className="h-3.5 w-3.5" /> Poster QR
                        </span>
                        <span className="text-xs font-semibold text-primary-600 hover:text-primary-700">
                          Detail &rarr;
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="col-span-full card py-20 text-center">
                <Home className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-gray-500">Tidak ada kosan yang cocok dengan pencarian</p>
                <Link href="/kosan/tambah" className="btn-primary mt-4 inline-flex">
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Kosan Baru
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
