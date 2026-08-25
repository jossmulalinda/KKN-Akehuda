"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Users,
  Search,
  Trash2,
  Phone,
  KeyRound,
  Check,
  Send,
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldAlert,
} from "lucide-react";
import type { Profile, PasswordReset } from "@/lib/types/database";

export default function PemilikKosPage() {
  const [pemilikList, setPemilikList] = useState<Profile[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordReset[]>([]);
  const [activeTab, setActiveTab] = useState<"daftar" | "permintaan">("daftar");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form tambah state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Type to confirm delete state
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [confirmInputName, setConfirmInputName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  // Reset password modal state
  const [resetModalUser, setResetModalUser] = useState<{
    id: string;
    name: string;
    phone?: string | null;
    email?: string;
    requestId?: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const fetchData = async () => {
    const supabase = createClient();

    const [pemilikRes, resetRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "admin_kos")
        .order("full_name"),
      supabase
        .from("password_resets")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (pemilikRes.data) setPemilikList(pemilikRes.data as Profile[]);
    if (resetRes.data) setResetRequests(resetRes.data as PasswordReset[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddPemilik = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const supabase = createClient();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: "admin_kos",
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        await supabase.from("profiles").upsert({
          id: authData.user.id,
          full_name: fullName,
          phone: phone || null,
          role: "admin_kos",
        });
      }

      setShowModal(false);
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setSuccessAlert(`Akun pemilik kos "${fullName}" berhasil ditambahkan!`);
      setTimeout(() => setSuccessAlert(null), 6000);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || "Gagal menambahkan pemilik kos");
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    // Strict name match verification
    if (
      confirmInputName.trim().toLowerCase() !==
      deleteTarget.full_name.trim().toLowerCase()
    ) {
      alert("Nama yang Anda ketik tidak cocok dengan nama pemilik kos.");
      return;
    }

    setDeleting(true);
    const targetName = deleteTarget.full_name;
    const targetId = deleteTarget.id;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", targetId);

      if (error) throw error;

      setPemilikList((prev) => prev.filter((p) => p.id !== targetId));
      setDeleteTarget(null);
      setConfirmInputName("");
      setSuccessAlert(
        `Akun pemilik kos "${targetName}" beserta seluruh data kosan terkait telah berhasil dihapus dari sistem.`
      );
      setTimeout(() => setSuccessAlert(null), 7000);
    } catch (err: any) {
      alert("Gagal menghapus akun: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setDeleting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPassword) return;

    setResetLoading(true);
    try {
      const supabase = createClient();

      const { error } = await supabase.rpc("admin_reset_user_password", {
        target_user_id: resetModalUser.id,
        new_plain_password: newPassword,
      });

      if (error) throw error;

      if (resetModalUser.requestId) {
        await supabase
          .from("password_resets")
          .update({ status: "selesai" })
          .eq("id", resetModalUser.requestId);
      }

      setResetSuccess(true);
      fetchData();
    } catch (err: any) {
      alert("Gagal mereset password: " + (err.message || ""));
    } finally {
      setResetLoading(false);
    }
  };

  const getWhatsAppLink = (
    phoneNum: string | null | undefined,
    name: string,
    pass: string
  ) => {
    if (!phoneNum) return "";
    let cleanPhone = phoneNum.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    }
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const message = `Halo Ibu/Bapak ${name},\n\nPassword akun SIKOSAN (Kelurahan Akehuda) Anda telah berhasil direset.\n\n🔑 *Password Baru*: ${pass}\n🌐 *Link Login*: ${origin}/login\n\nSilakan login dan simpan password ini dengan baik. Terima kasih!`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const pendingRequestsCount = resetRequests.filter(
    (r) => r.status === "pending"
  ).length;

  const filtered = pemilikList.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.phone && p.phone.includes(search))
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">
            Pemilik Kos
          </h1>
          <p className="mt-1 text-gray-500">
            Kelola akun, reset password, dan pantau pemilik kos di Kelurahan Akehuda
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          Tambah Pemilik Kos
        </button>
      </div>

      {/* Global Success Alert Banner */}
      {successAlert && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-300 p-4 text-emerald-800 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                Berhasil Dihapus / Diperbarui
              </p>
              <p className="text-sm font-medium text-emerald-800">{successAlert}</p>
            </div>
          </div>
          <button
            onClick={() => setSuccessAlert(null)}
            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("daftar")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "daftar"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Daftar Pemilik Kos ({pemilikList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("permintaan")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "permintaan"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          <span>Permintaan Lupa Sandi</span>
          {pendingRequestsCount > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
              {pendingRequestsCount} baru
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: DAFTAR PEMILIK KOS */}
      {activeTab === "daftar" && (
        <div className="mt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama atau nomor HP pemilik kos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10 text-sm"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full py-20 text-center text-gray-400">
                Memuat data pemilik kos...
              </div>
            ) : filtered.length > 0 ? (
              filtered.map((pemilik) => (
                <div
                  key={pemilik.id}
                  className="card hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setResetModalUser({
                              id: pemilik.id,
                              name: pemilik.full_name,
                              phone: pemilik.phone,
                            });
                            setNewPassword("");
                            setResetSuccess(false);
                          }}
                          className="btn-ghost p-1.5 text-gray-400 hover:text-teal-600"
                          title="Reset / Ubah Password Pemilik Kos"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(pemilik);
                            setConfirmInputName("");
                          }}
                          className="btn-ghost p-1.5 text-gray-400 hover:text-rose-600 transition-colors"
                          title="Hapus akun pemilik kos"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="mt-3 font-heading font-semibold text-gray-900">
                      {pemilik.full_name}
                    </h3>
                    {pemilik.phone ? (
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                        <Phone className="h-3.5 w-3.5 text-teal-600" />
                        <span>{pemilik.phone}</span>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-gray-400">Belum ada nomor HP</p>
                    )}
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <button
                      onClick={() => {
                        setResetModalUser({
                          id: pemilik.id,
                          name: pemilik.full_name,
                          phone: pemilik.phone,
                        });
                        setNewPassword("");
                        setResetSuccess(false);
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-50 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <KeyRound className="h-3.5 w-3.5 text-teal-600" />
                      <span>Ubah Password Akun</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full card py-20 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-gray-500">Belum ada pemilik kos terdaftar</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PERMINTAAN LUPA SANDI */}
      {activeTab === "permintaan" && (
        <div className="mt-6 space-y-4">
          {resetRequests.length > 0 ? (
            resetRequests.map((req) => {
              const matchedPemilik = pemilikList.find(
                (p) => p.phone === req.no_hp
              );

              return (
                <div
                  key={req.id}
                  className={`card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${
                    req.status === "pending"
                      ? "border-amber-200 bg-amber-50/40"
                      : "bg-white opacity-80"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {req.nama || "Pemilik Kos"}
                      </h3>
                      {req.status === "pending" ? (
                        <span className="badge badge-warning flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Menunggu Reset
                        </span>
                      ) : (
                        <span className="badge badge-success flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Selesai Diberikan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Email/Username: <strong>{req.email}</strong> • No HP:{" "}
                      <strong>{req.no_hp || "-"}</strong>
                    </p>
                    {req.keterangan && (
                      <p className="text-xs text-gray-600 bg-white/80 p-2 rounded-lg border border-gray-100 mt-1">
                        💬 &quot;{req.keterangan}&quot;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {req.status === "pending" && (
                      <button
                        onClick={() => {
                          setResetModalUser({
                            id: matchedPemilik?.id || "",
                            name: req.nama || "Pemilik Kos",
                            phone: req.no_hp,
                            email: req.email,
                            requestId: req.id,
                          });
                          setNewPassword("");
                          setResetSuccess(false);
                        }}
                        className="btn-primary text-xs px-4 py-2"
                      >
                        <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                        Resetkan Password
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="card py-20 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
              <p className="mt-4 text-gray-700 font-medium">Tidak ada permintaan lupa password</p>
              <p className="text-xs text-gray-400 mt-1">
                Semua akun pemilik kos aktif dan tidak ada kendala login.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SECURITY MODAL: TYPE TO CONFIRM DELETE PEMILIK KOS */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 border-b border-gray-100 pb-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100">
                <ShieldAlert className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-gray-900">
                  Konfirmasi Hapus Akun Pemilik Kos
                </h3>
                <p className="text-xs text-rose-600 font-medium">Tindakan ini permanen & berbahaya</p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <p>
                Anda akan menghapus akun pemilik kos:{" "}
                <strong className="text-gray-900 text-base underline decoration-rose-400 decoration-2">
                  {deleteTarget.full_name}
                </strong>
              </p>

              <div className="rounded-xl bg-rose-50 p-3.5 border border-rose-200 text-xs text-rose-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-rose-900">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  PERINGATAN PENGHAPUSAN DATA:
                </p>
                <p>
                  Seluruh data <strong>Kosan</strong>, <strong>Kamar</strong>, dan <strong>Penghuni</strong> yang terdaftar di bawah akun ini akan <strong>ikut terhapus secara permanen</strong> dari sistem Kelurahan Akehuda.
                </p>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Ketik nama pemilik kos <span className="font-mono font-bold text-rose-600 select-all bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">&quot;{deleteTarget.full_name}&quot;</span> di bawah untuk mengonfirmasi:
                </label>
                <input
                  type="text"
                  value={confirmInputName}
                  onChange={(e) => setConfirmInputName(e.target.value)}
                  placeholder={`Ketik ${deleteTarget.full_name}`}
                  className="input-field border-rose-300 focus:border-rose-500 focus:ring-rose-200 font-medium text-sm"
                  autoFocus
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setConfirmInputName("");
                }}
                disabled={deleting}
                className="btn-ghost flex-1 text-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={
                  deleting ||
                  confirmInputName.trim().toLowerCase() !==
                    deleteTarget.full_name.trim().toLowerCase()
                }
                className="btn-danger flex-1 text-sm bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus Permanen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESET PASSWORD */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-gray-900">
                  Ubah Password Pemilik Kos
                </h2>
                <p className="text-xs text-gray-500">{resetModalUser.name}</p>
              </div>
            </div>

            {!resetSuccess ? (
              <form onSubmit={handleResetPassword} className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Masukkan Password Baru <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field font-mono"
                    placeholder="Contoh: akehuda2026 / 123456"
                    minLength={6}
                    required
                  />
                  <p className="text-[11px] text-gray-400">
                    Minimal 6 karakter. Password ini bisa langsung diberikan ke pemilik kos.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="btn-secondary flex-1"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading || newPassword.length < 6}
                    className="btn-primary flex-1"
                  >
                    {resetLoading ? "Menyimpan..." : "Simpan Password Baru"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
                  <Check className="mx-auto h-8 w-8 text-green-600" />
                  <h3 className="font-semibold text-green-900 mt-2 text-sm">
                    Password Berhasil Diubah!
                  </h3>
                  <p className="text-xs text-green-700 mt-1">
                    Password baru untuk <strong>{resetModalUser.name}</strong>:
                  </p>
                  <div className="mt-2 rounded-lg bg-white p-2 border border-green-300 font-mono font-bold text-gray-900 text-base">
                    {newPassword}
                  </div>
                </div>

                {resetModalUser.phone && (
                  <a
                    href={getWhatsAppLink(
                      resetModalUser.phone,
                      resetModalUser.name,
                      newPassword
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary w-full py-2.5 inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white"
                  >
                    <Send className="h-4 w-4" />
                    <span>Kirim Password ke WhatsApp Pemilik Kos</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="btn-secondary w-full"
                >
                  Selesai & Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PEMILIK KOS */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="font-heading text-xl font-semibold text-gray-900">
              Tambah Pemilik Kos Baru
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Buatkan akun login resmi untuk pemilik kos
            </p>

            <form onSubmit={handleAddPemilik} className="mt-6 space-y-4">
              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Nama Lengkap Pemilik <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                  placeholder="Contoh: Ibu Fatimah"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Email / Username Login <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="contoh: fatimah@kosan.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Nomor HP / WhatsApp Aktif <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field"
                  placeholder="Contoh: 081234567890"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Password Awal <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="Minimal 6 karakter"
                  minLength={6}
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn-primary flex-1"
                >
                  {formLoading ? "Menyimpan..." : "Simpan & Buat Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
