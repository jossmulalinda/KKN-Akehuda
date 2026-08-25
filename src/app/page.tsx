import Link from "next/link";
import { ClipboardList, QrCode, Shield, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/favicon.png"
              alt="Logo SIKOSAN"
              className="h-10 w-10 rounded-xl object-contain shadow-sm"
            />
            <div>
              <h1 className="font-heading text-lg font-bold text-gray-900">
                SIKOSAN
              </h1>
              <p className="text-xs text-gray-500">Kelurahan Akehuda</p>
            </div>
          </div>
          <Link href="/login" className="btn-primary">
            Masuk Dashboard
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <span className="badge badge-info mb-4">Kelurahan Akehuda, Ternate</span>
          <h2 className="font-heading text-4xl font-bold text-gray-900 sm:text-5xl">
            Sistem Pendataan{" "}
            <span className="text-primary-600">Penghuni Kosan</span> Digital
          </h2>
          <p className="mt-6 text-lg text-gray-500">
            Memudahkan Kelurahan Akehuda dalam memantau dan mendata penghuni
            kosan secara digital melalui QR Code. Cepat, aman, dan mudah
            digunakan.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/login" className="btn-primary text-base px-8 py-3">
              Masuk Dashboard
            </Link>
            <a href="#fitur" className="btn-secondary text-base px-8 py-3">
              Pelajari Lebih Lanjut
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="fitur" className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h3 className="text-center font-heading text-3xl font-bold text-gray-900">
            Fitur Utama
          </h3>
          <p className="mt-3 text-center text-gray-500">
            Semua yang dibutuhkan untuk pendataan kosan yang efisien
          </p>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card text-center hover:shadow-md transition-shadow">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                <QrCode className="h-6 w-6" />
              </div>
              <h4 className="mt-4 font-heading font-semibold text-gray-900">
                QR Code Otomatis
              </h4>
              <p className="mt-2 text-sm text-gray-500">
                Setiap kosan mendapat QR Code unik. Tinggal scan dan isi data.
              </p>
            </div>

            <div className="card text-center hover:shadow-md transition-shadow">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <ClipboardList className="h-6 w-6" />
              </div>
              <h4 className="mt-4 font-heading font-semibold text-gray-900">
                Form Digital
              </h4>
              <p className="mt-2 text-sm text-gray-500">
                Penghuni isi form online. Data langsung masuk ke sistem kelurahan.
              </p>
            </div>

            <div className="card text-center hover:shadow-md transition-shadow">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <Users className="h-6 w-6" />
              </div>
              <h4 className="mt-4 font-heading font-semibold text-gray-900">
                Kelola Pemilik Kos
              </h4>
              <p className="mt-2 text-sm text-gray-500">
                Pemilik kos bisa mengelola data penghuni masing-masing kosannya.
              </p>
            </div>

            <div className="card text-center hover:shadow-md transition-shadow">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <Shield className="h-6 w-6" />
              </div>
              <h4 className="mt-4 font-heading font-semibold text-gray-900">
                Data Aman
              </h4>
              <p className="mt-2 text-sm text-gray-500">
                Data tersimpan aman di database. Hanya pihak berwenang yang bisa akses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} SIKOSAN - Kelurahan Akehuda, Kota Ternate.
            Seluruh hak dilindungi.
          </p>
        </div>
      </footer>
    </div>
  );
}
