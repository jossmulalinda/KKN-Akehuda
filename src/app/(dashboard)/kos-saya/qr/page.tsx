import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QRCodeDisplay } from "@/components/qr-code";
import { getFormUrl } from "@/lib/utils";
import { QrCode } from "lucide-react";

export default async function QRCodePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: kosanList } = await supabase
    .from("kosan")
    .select("id, nama, alamat, kode_unik")
    .eq("pemilik_id", user.id)
    .order("nama");

  const kosans = (kosanList || []) as Array<{
    id: string;
    nama: string;
    alamat: string;
    kode_unik: string;
  }>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-gray-900">
          QR Code
        </h1>
        <p className="mt-1 text-gray-500">
          Bagikan QR Code atau link ke penghuni untuk mengisi form pendataan
        </p>
      </div>

      {kosans.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {kosans.map((kosan) => (
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
        <div className="card py-20 text-center">
          <QrCode className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">
            Belum ada kosan yang terdaftar.
          </p>
        </div>
      )}
    </div>
  );
}
