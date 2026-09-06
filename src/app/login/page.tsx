"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogIn, Eye, EyeOff, HelpCircle, CheckCircle, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTimeout = searchParams.get("timeout") === "1";

  // Lupa password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotName, setForgotName] = useState("");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      let emailToAuth = identifier.trim();

      // Convert phone number or plain username to internal email format
      if (!emailToAuth.includes("@")) {
        const cleanPhone = emailToAuth.replace(/\D/g, "");
        if (cleanPhone.length >= 8) {
          emailToAuth = `${cleanPhone}@sikosan.akehuda.id`;
        } else {
          emailToAuth = `${emailToAuth.toLowerCase().replace(/\s+/g, "")}@sikosan.akehuda.id`;
        }
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: emailToAuth,
        password,
      });

      if (authError) {
        setError("Username atau password salah. Silakan periksa kembali.");
        return;
      }

      if (data?.session) {
        localStorage.setItem("sikosan_last_active", Date.now().toString());
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
      const cleanPhone = forgotPhone.trim().replace(/\D/g, "");
      const generatedEmail = `${cleanPhone}@sikosan.akehuda.id`;

      const { error } = await supabase.from("password_resets").insert({
        email: generatedEmail,
        nama: forgotName.trim() || null,
        no_hp: forgotPhone.trim() || null,
        keterangan: "Lupa password akun",
        status: "pending",
      });

      if (error) throw error;
      setForgotSuccess(true);
    } catch (err: any) {
      setForgotError(err.message || "Gagal mengirim permohonan.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-3">
            <img
              src="/favicon.png"
              alt="Logo SIKOSAN"
              className="h-14 w-auto object-contain bg-transparent"
            />
            <div className="text-left">
              <h1 className="font-heading text-2xl font-bold text-gray-900 tracking-tight">
                SIKOSAN
              </h1>
              <p className="text-xs text-gray-500 font-medium">Kelurahan Akehuda</p>
            </div>
          </Link>
        </div>

        {/* Login Card */}
        <div className="card shadow-sm border border-gray-200">
          <h2 className="text-center font-heading text-xl font-bold text-gray-900">
            Masuk ke Dashboard
          </h2>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            {/* Session Timeout Simple Alert */}
            {isTimeout && !error && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-800 flex items-center gap-2.5 animate-in fade-in">
                <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Sesi Anda telah berakhir karena 2 jam tidak ada aktivitas. Silakan masuk kembali.</span>
              </div>
            )}

            {/* Error Simple Alert */}
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-600 font-medium flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Username Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="identifier"
                className="text-sm font-semibold text-gray-700 block"
              >
                Username
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="input-field font-mono text-sm"
                placeholder="Masukkan username Anda"
                required
                autoFocus
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-semibold text-gray-700 block"
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
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium"
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
                  className="input-field pr-12 font-mono text-sm"
                  placeholder="Masukkan password Anda"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm font-semibold bg-teal-600 hover:bg-teal-700 shadow-sm mt-2"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Memproses...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <LogIn className="h-4 w-4" />
                  <span>Masuk ke Dashboard</span>
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} SIKOSAN - Kelurahan Akehuda
        </p>
      </div>

      {/* MODAL LUPA PASSWORD */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-gray-900">
                  Lupa Password Akun?
                </h2>
                <p className="text-xs text-gray-500">
                  Kirim permohonan ke Admin Kelurahan Akehuda
                </p>
              </div>
            </div>

            {!forgotSuccess ? (
              <form onSubmit={handleForgotSubmit} className="mt-5 space-y-4">
                {forgotError && (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-600">
                    {forgotError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Nama Pemilik / Nama Kosan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={forgotName}
                    onChange={(e) => setForgotName(e.target.value)}
                    className="input-field text-sm"
                    placeholder="Contoh: Ibu Siti / Kos Melati"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Nomor WhatsApp / HP Aktif <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={forgotPhone}
                    onChange={(e) => setForgotPhone(e.target.value)}
                    className="input-field text-sm font-mono"
                    placeholder="Contoh: 081234567890"
                    required
                  />
                  <p className="text-[11px] text-gray-400">
                    Admin kelurahan akan mengirimkan password baru langsung ke nomor WhatsApp ini.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="btn-secondary flex-1 text-xs py-2.5"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-primary flex-1 text-xs py-2.5 bg-teal-600 hover:bg-teal-700"
                  >
                    {forgotLoading ? "Mengirim..." : "Kirim Permohonan"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-5 space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-gray-900 text-base">
                  Permohonan Terkirim ke Kelurahan!
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Pihak Kelurahan Akehuda telah menerima permohonan Anda. Password baru akan segera dibuatkan dan dikirimkan langsung ke nomor WhatsApp <strong>{forgotPhone}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="btn-primary w-full mt-4 bg-teal-600 hover:bg-teal-700 text-xs py-2.5"
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-400">Memuat...</div>}>
      <LoginForm />
    </Suspense>
  );
}
