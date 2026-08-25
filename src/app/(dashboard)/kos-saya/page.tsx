import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Home, Users, ClipboardList, QrCode, MapPin } from "lucide-react";

export default async function KosSayaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: kosanList } = await supabase
    .from("kosan")
    .select(`
      *,
      kamar (
        id,
        status,
        penghuni (id)
      )
    `)
    .eq("pemilik_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-gray-900">
          Kos Saya
        </h1>
        <p className="mt-1 text-gray-500">
          Kelola kosan dan penghuni Anda
        </p>
      </div>

      {kosanList && kosanList.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {kosanList.map((kosan: any) => {
            const totalKamar = kosan.kamar?.length || 0;
            const totalPenghuni = kosan.kamar?.reduce(
              (sum: number, k: any) => sum + (k.penghuni?.length || 0),
              0
            ) || 0;
            const kamarTerisi = kosan.kamar?.filter(
              (k: any) => k.status === "aktif"
            ).length || 0;

            return (
              <div key={kosan.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-heading text-xl font-semibold text-gray-900">
                      {kosan.nama}
                    </h2>
                    <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="h-4 w-4" />
                      <span>{kosan.alamat}</span>
                    </div>
                  </div>
                  <span className="badge badge-success">Aktif</span>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-primary-50 p-3 text-center">
                    <ClipboardList className="mx-auto h-5 w-5 text-primary-600" />
                    <p className="mt-1 text-lg font-bold text-gray-900">{totalKamar}</p>
                    <p className="text-xs text-gray-500">Kamar</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3 text-center">
                    <Users className="mx-auto h-5 w-5 text-blue-600" />
                    <p className="mt-1 text-lg font-bold text-gray-900">{totalPenghuni}</p>
                    <p className="text-xs text-gray-500">Penghuni</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3 text-center">
                    <Home className="mx-auto h-5 w-5 text-green-600" />
                    <p className="mt-1 text-lg font-bold text-gray-900">{kamarTerisi}</p>
                    <p className="text-xs text-gray-500">Terisi</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link href="/kos-saya/kamar" className="btn-secondary flex-1 text-sm">
                    <ClipboardList className="mr-1.5 h-4 w-4" />
                    Kelola Kamar
                  </Link>
                  <Link href="/kos-saya/qr" className="btn-primary flex-1 text-sm">
                    <QrCode className="mr-1.5 h-4 w-4" />
                    QR Code
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card py-20 text-center">
          <Home className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">
            Belum ada kosan yang ditugaskan ke akun Anda.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Hubungi admin kelurahan untuk mendaftarkan kosan Anda.
          </p>
        </div>
      )}
    </div>
  );
}
