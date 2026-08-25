import { createClient } from "@/lib/supabase/server";
import { Home, Users, ClipboardList, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch statistics
  const [kosanResult, penghuniResult, kamarResult] = await Promise.all([
    supabase.from("kosan").select("id", { count: "exact", head: true }),
    supabase.from("penghuni").select("id", { count: "exact", head: true }),
    supabase.from("kamar").select("id", { count: "exact", head: true }),
  ]);

  const totalKosan = kosanResult.count || 0;
  const totalPenghuni = penghuniResult.count || 0;
  const totalKamar = kamarResult.count || 0;

  // Fetch recent penghuni
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
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p className="mt-1 text-gray-500">
          Selamat datang di Sistem Informasi Kosan Kelurahan Akehuda
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.color}`}
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

      {/* Recent Penghuni */}
      <div className="mt-8">
        <h2 className="font-heading text-xl font-semibold text-gray-900">
          Penghuni Terbaru
        </h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Nama
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Asal
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Kosan
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentPenghuni && recentPenghuni.length > 0 ? (
                recentPenghuni.map((p: Record<string, unknown>) => (
                  <tr key={p.id as string} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {p.nama_lengkap as string}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {p.asal_daerah as string}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {(p.kosan as Record<string, unknown>)?.nama as string || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-success">
                        {(p.status_pekerjaan as string) === "mahasiswa"
                          ? "Mahasiswa"
                          : (p.status_pekerjaan as string) === "pekerja"
                          ? "Pekerja"
                          : "Lainnya"}
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
                    Belum ada data penghuni
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
