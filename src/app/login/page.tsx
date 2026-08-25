"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogIn, Eye, EyeOff, HelpCircle, CheckCircle, Send, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Lupa password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotName, setForgotName] = useState("");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotNote, setForgotNote] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError("Email atau password salah. Silakan periksa kembali.");
        return;
      }

      if (data?.session) {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Terjadi kesalahan koneksi. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.from("password_resets").insert({
        email: forgotEmail.trim(),
        nama: forgotName.trim() || null,
        no_hp: forgotPhone.trim() || null,
        keterangan: forgotNote.trim() || "Lupa password akun kosan",
        status: "pending",
      });

      if (error) throw error;
      setForgotSuccess(true);
    } catch (err: any) {
      setForgotError(err.message || "Gagal mengirim permintaan.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-3">
            <img
              src="/favicon.png"
              alt="Logo SIKOSAN"
              className="h-12 w-12 rounded-2xl object-contain shadow-sm"
            />
            <div className="text-left">
              <h1 className="font-heading text-2xl font-bold text-gray-900">
                SIKOSAN
              </h1>
              <p className="text-sm text-gray-500">Kelurahan Akehuda</p>
            </div>
          </Link>
        </div>

        {/* Login Card */}
        <div className="card">
          <h2 className="text-center font-heading text-xl font-semibold text-gray-900">
            Masuk ke Dashboard
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            Gunakan akun yang telah diberikan oleh kelurahan
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                Email / Username
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="contoh@email.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotSuccess(false);
                    setForgotError(null);
                  }}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  Lupa Password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-12"
                  placeholder="Masukkan password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Memproses...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="h-5 w-5" />
                  <span>Masuk ke Dashboard</span>
                </div>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} SIKOSAN — Kelurahan Akehuda
        </p>
      </div>

      {/* MODAL LUPA PASSWORD */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-gray-900">
                  Lupa Password Akun?
                </h2>
                <p className="text-xs text-gray-500">
                  Kirim permohonan reset password ke Admin Kelurahan Akehuda
                </p>
              </div>
            </div>

            {!forgotSuccess ? (
              <form onSubmit={handleForgotSubmit} className="mt-5 space-y-4">
                {forgotError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-600">
                    {forgotError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Email Akun / Username yang Diingat <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="input-field"
                    placeholder="contoh@email.com"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Nama Pemilik Kos / Nama Kosan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={forgotName}
                    onChange={(e) => setForgotName(e.target.value)}
                    className="input-field"
                    placeholder="Contoh: Ibu Siti / Kos Mawar"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Nomor WhatsApp Aktif <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={forgotPhone}
                    onChange={(e) => setForgotPhone(e.target.value)}
                    className="input-field"
                    placeholder="08xxxxxxxxxx"
                    required
                  />
                  <p className="text-[11px] text-gray-400">
                    Admin kelurahan akan mengirimkan password baru ke nomor WhatsApp ini.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-primary flex-1"
                  >
                    {forgotLoading ? "Mengirim..." : "Kirim Permohonan"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-5 space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-gray-900">
                  Permohonan Terkirim ke Kelurahan!
                </h3>
                <p className="text-xs text-gray-600">
                  Pihak Kelurahan Akehuda telah menerima permohonan Anda. Password baru akan segera dibuatkan dan dikirimkan langsung ke nomor WhatsApp <strong>{forgotPhone}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="btn-primary w-full mt-4"
                >
                  Kembali ke Halaman Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
