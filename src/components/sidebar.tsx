"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";
import {
  LayoutDashboard,
  Home,
  Users,
  ClipboardList,
  QrCode,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  profile: Profile;
}

const superadminMenu = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Kosan", href: "/kosan", icon: Home },
  { label: "Pemilik Kos", href: "/pemilik-kos", icon: Users },
  { label: "Penghuni", href: "/penghuni", icon: ClipboardList },
];

const adminKosMenu = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Kos Saya", href: "/kos-saya", icon: Home },
  { label: "Kelola Kamar", href: "/kos-saya/kamar", icon: ClipboardList },
  { label: "QR Code", href: "/kos-saya/qr", icon: QrCode },
];

export function Sidebar({ profile }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = profile.role === "superadmin" ? superadminMenu : adminKosMenu;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg bg-primary-800 p-2 text-white shadow-lg lg:hidden"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-primary-800 transition-transform duration-300 lg:relative lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <img
              src="/favicon.png"
              alt="Logo SIKOSAN"
              className="h-10 w-10 rounded-xl object-contain bg-white/10 p-0.5"
            />
            <div>
              <h1 className="font-heading text-base font-bold text-white">
                SIKOSAN
              </h1>
              <p className="text-xs text-primary-200">Kelurahan Akehuda</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-primary-200 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-700 text-white"
                    : "text-primary-100 hover:bg-primary-700/50 hover:text-white"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
              </Link>
            );
          })}
        </nav>

        {/* User info & Logout */}
        <div className="border-t border-primary-700 px-4 py-4">
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-white">{profile.full_name}</p>
            <p className="text-xs text-primary-300">
              {profile.role === "superadmin" ? "Admin Kelurahan" : "Pemilik Kos"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-primary-200 transition-colors hover:bg-primary-700 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>
    </>
  );
}
