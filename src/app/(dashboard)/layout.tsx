import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import type { Profile } from "@/lib/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Fallback profile if profile row is still syncing or missing
  const activeProfile: Profile = (profile as Profile) || {
    id: user.id,
    full_name:
      (user.user_metadata?.full_name as string) ||
      user.email?.split("@")[0] ||
      "Admin",
    role: (user.user_metadata?.role as any) || "superadmin",
    phone: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar profile={activeProfile} />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
