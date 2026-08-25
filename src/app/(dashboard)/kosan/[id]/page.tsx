import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, MapPin, User, Calendar, Home, ExternalLink, Edit } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { MapView } from "@/components/map-view";
import { KosanPenghuniTable } from "@/components/kosan-penghuni-table";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DetailKosanPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: kosan } = await supabase
    .from("kosan")
    .select(`
      *,
      profiles!pemilik_id (full_name, phone),
      kamar (
        *,
        penghuni (*)
      )
    `)
    .eq("id", id)
    .single();

  if (!kosan) {
    notFound();
  }

  const kosanData = kosan as any;

  const totalPenghuni = kosanData.kamar?.reduce(
    (sum: number, k: any) => sum + (k.penghuni?.length || 0),
    0
  ) || 0;

  const kamarTerisi = kosanData.kamar?.filter(
    (k: any) => k.status === "aktif"
  ).length || 0;

  const mapItem = {
    id: kosanData.id,
    nama: kosanData.nama,
    alamat: kosanData.alamat,
    latitude: kosanData.latitude,
    longitude: kosanData.longitude,
    pemilik_name: kosanData.profiles?.full_name,
    total_kamar: kosanData.kamar?.length || 0,
    total_penghuni: totalPenghuni,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/kosan"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Kosan
        </Link>
      </div>

      {/* Kosan Info Card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-gray-900">
              {kosanData.nama}
            </h1>
            <div className="mt-2 flex items-center gap-1.5 text-gray-500 text-sm">
              <MapPin className="h-4 w-4 shrink-0 text-primary-600" />
              <span>{kosanData.alamat}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/kosan/${id}/edit`}
              className="btn-secondary text-xs px-3.5 py-2 inline-flex items-center gap-1.5 font-medium"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Edit Kosan</span>
            </Link>
            <span className="badge badge-success">Terdaftar</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-gray-50 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {kosanData.kamar?.length || 0}
            </p>
            <p className="text-xs text-gray-500">Total Kamar</p>
            <p className="text-[11px] text-primary-600 font-medium mt-0.5">({kamarTerisi} Terisi)</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {totalPenghuni}
            </p>
            <p className="text-xs text-gray-500">Total Penghuni</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 text-center">
            <p className="text-lg font-bold text-gray-900 truncate">
              {kosanData.profiles?.full_name || "-"}
            </p>
            <p className="text-xs text-gray-500">Pemilik Kos</p>
            {kosanData.profiles?.phone && (
              <p className="text-[11px] text-gray-400 mt-0.5">{kosanData.profiles.phone}</p>
            )}
          </div>
        </div>

        {/* Google maps link */}
        {kosanData.latitude && kosanData.longitude && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Titik Koordinat: {kosanData.latitude.toFixed(5)}, {kosanData.longitude.toFixed(5)}
            </span>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${kosanData.latitude},${kosanData.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
            >
              <span>Buka Petunjuk Arah</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Map Location Card */}
      {kosanData.latitude && kosanData.longitude && (
        <div className="card">
          <h2 className="font-heading text-lg font-semibold text-gray-900 mb-3">
            Lokasi di Peta Kelurahan Akehuda
          </h2>
          <MapView
            kosanList={[mapItem]}
            centerLat={kosanData.latitude}
            centerLng={kosanData.longitude}
            zoom={16}
            heightClass="h-64"
          />
        </div>
      )}

      {/* Penghuni Table */}
      <KosanPenghuniTable
        initialPenghuniList={(kosanData.kamar || []).flatMap((kamar: any) =>
          (kamar.penghuni || []).map((p: any) => ({
            id: p.id,
            nama_lengkap: p.nama_lengkap,
            asal_daerah: p.asal_daerah,
            jenis_kelamin: p.jenis_kelamin,
            no_hp: p.no_hp,
            status_pekerjaan: p.status_pekerjaan,
            foto_url: p.foto_url,
            created_at: p.created_at,
            kamar_id: kamar.id,
            nomor_kamar: kamar.nomor_kamar,
            hubungan: kamar.hubungan,
          }))
        )}
        kosanNama={kosanData.nama}
      />
    </div>
  );
}
