import { createClient } from "@/lib/supabase/server";
import { Home, Users, ClipboardList, TrendingUp, QrCode, DoorOpen, ArrowRight } from "lucide-react";
import Link from "next/link";
import { QRCodeDisplay } from "@/components/qr-code";
import { getFormUrl } from "@/lib/utils";
import type { Profile } from "@/lib/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id || "")
    .maybeSingle();

  const profile = (profileData as Profile) || {
    role: "admin_kos",
    full_name: "Pengguna",
  };

  const isSuperadmin = profile.role === "superadmin";

  // If Pemilik Kos, fetch their own kosans
  if (!isSuperadmin && user) {
    const { data: kosanList } = await supabase
      .from("kosan")
      .select(`
        *,
        kamar (
          id,
          nomor_kamar,
          status,
          penghuni (id, nama_lengkap, asal_daerah, status_pekerjaan, created_at)
        )
      `)
      .eq("pemilik_id", user.id)
      .order("created_at", { ascending: false });

    const myKosans = (kosanList || []) as any[];

    const totalKosan = myKosans.length;
    const totalKamar = myKosans.reduce(
      (sum, k) => sum + (k.kamar?.length || 0),
      0
    );
    const kamarTerisi = myKosans.reduce(
      (sum, k) =>
        sum +
        (k.kamar?.filter((kmr: any) => kmr.status === "aktif")?.length || 0),
      0
    );
    const totalPenghuni = myKosans.reduce(
      (sum, k) =>
        sum +
        (k.kamar?.reduce(
          (ksum: number, kmr: any) => ksum + (kmr.penghuni?.length || 0),
          0
        ) || 0),
      0
    );

    const stats = [
      {
        label: "Kos Saya",
        value: totalKosan,
        icon: Home,
        color: "bg-teal-100 text-teal-700",
      },
      {
        label: "Total Kamar",
        value: totalKamar,
        icon: ClipboardList,
        color: "bg-amber-100 text-amber-700",
      },
      {
        label: "Kamar Terisi",
        value: kamarTerisi,
        icon: DoorOpen,
        color: "bg-emerald-100 text-emerald-700",
      },
      {
        label: "Total Penghuni",
        value: totalPenghuni,
        icon: Users,
        color: "bg-blue-100 text-blue-700",
      },
    ];

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="badge badge-info mb-1">Akun Pemilik Kos</span>
            <h1 className="font-heading text-3xl font-bold text-gray-900">
              Selamat Datang, {profile.full_name}!
            </h1>
            <p className="text-sm text-gray-500">
              Kelola kosan, pantau penghuni aktif, dan bagikan poster QR Code resmi Anda
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/kos-saya/kamar" className="btn-secondary text-xs">
              <ClipboardList className="mr-1.5 h-4 w-4" /> Kelola Kamar
            </Link>
            <Link href="/kos-saya/qr" className="btn-primary text-xs">
              <QrCode className="mr-1.5 h-4 w-4" /> Buka Menu QR Code
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.color}`}
                >
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* QR Code Section (Prominent for Pemilik Kos) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-gray-900 flex items-center gap-2">
                <QrCode className="h-5 w-5 text-teal-600" />
                QR Code Formulir Pendaftaran Kos Anda
              </h2>
              <p className="text-xs text-gray-500">
                Tempel poster QR Code ini di kosan Anda. Calon penghuni cukup scan untuk mengisi form.
              </p>
            </div>
            <Link
              href="/kos-saya/qr"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
            >
              Lihat di Halaman Khusus <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {myKosans.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {myKosans.map((kosan) => (
                <QRCodeDisplay
                  key={kosan.id}
                  url={getFormUrl(kosan.kode_unik)}
                  kodeUnik={kosan.kode_unik}
                  namaKosan={kosan.nama}
                  alamatKosan={kosan.alamat}
                />
              ))}
            </div>
          ) : (
            <div className="card py-16 text-center border-dashed border-2 border-gray-200">
              <QrCode className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-3 font-semibold text-gray-800 text-base">
                Belum Ada Kosan yang Ditugaskan
              </h3>
              <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
                Admin kelurahan belum mendaftarkan kosan ke akun Anda. Setelah didaftarkan, QR Code otomatis muncul di sini dan siap Anda cetak.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Superadmin view
  const [kosanResult, penghuniResult, kamarResult] = await Promise.all([
    supabase.from("kosan").select("id", { count: "exact", head: true }),
    supabase.from("penghuni").select("id", { count: "exact", head: true }),
    supabase.from("kamar").select("id", { count: "exact", head: true }),
  ]);

  const totalKosan = kosanResult.count || 0;
  const totalPenghuni = penghuniResult.count || 0;
  const totalKamar = kamarResult.count || 0;

  const { data: recentPenghuni } = await supabase
    .from("penghuni")
    .select(`
      id,
      nama_lengkap,
      asal_daerah,
      jenis_kelamin,
      status_pekerjaan,
      created_at,
      kosan (nama)
    `)
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    {
      label: "Total Kosan",
      value: totalKosan,
      icon: Home,
      color: "bg-primary-100 text-primary-600",
    },
    {
      label: "Total Penghuni",
      value: totalPenghuni,
      icon: Users,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Total Kamar",
      value: totalKamar,
      icon: ClipboardList,
      color: "bg-amber-100 text-amber-600",
    },
    {
      label: "Kamar Terisi",
      value: `${totalKamar > 0 ? Math.round((totalPenghuni / Math.max(totalKamar, 1)) * 100) : 0}%`,
      icon: TrendingUp,
      color: "bg-green-100 text-green-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <span className="badge badge-success mb-1">Admin Kelurahan</span>
        <h1 className="font-heading text-3xl font-bold text-gray-900">
          Dashboard Monitoring
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Sistem Informasi Pendataan & Pemetaan Kosan Kelurahan Akehuda, Kota Ternate
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}
              >
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick navigation banners */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/kosan"
          className="card p-5 hover:border-teal-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-teal-600">
                  Daftar & Peta Kosan
                </h3>
                <p className="text-xs text-gray-500">Lihat sebaran & cetak QR</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-teal-600" />
          </div>
        </Link>

        <Link
          href="/pemilik-kos"
          className="card p-5 hover:border-teal-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-amber-600">
                  Pemilik Kos
                </h3>
                <p className="text-xs text-gray-500">Kelola akun & reset sandi</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-amber-600" />
          </div>
        </Link>

        <Link
          href="/penghuni"
          className="card p-5 hover:border-teal-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                  Data Penghuni
                </h3>
                <p className="text-xs text-gray-500">Semua penghuni terdaftar</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
          </div>
        </Link>
      </div>

      {/* Recent Penghuni */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-xl font-semibold text-gray-900">
            Penghuni Baru Mendaftar
          </h2>
          <Link
            href="/penghuni"
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
          >
            Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Nama Lengkap
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Asal Daerah
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Kosan
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Status Pekerjaan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentPenghuni && recentPenghuni.length > 0 ? (
                recentPenghuni.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {p.nama_lengkap}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {p.asal_daerah}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                      {p.kosan?.nama || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-success capitalize text-[11px]">
                        {p.status_pekerjaan}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    Belum ada data penghuni baru
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
