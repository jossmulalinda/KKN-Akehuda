"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, X } from "lucide-react";

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showOnlineAlert, setShowOnlineAlert] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineAlert(true);
      // Auto dismiss online alert after 4 seconds
      const timer = setTimeout(() => {
        setShowOnlineAlert(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOnlineAlert(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!hasMounted) return null;

  return (
    <aside aria-label="Status Jaringan" className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-lg pointer-events-auto">
      {/* Offline Alert */}
      {!isOnline && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl bg-rose-600 px-4 py-3 text-white shadow-2xl ring-4 ring-rose-300/40 animate-bounce duration-1000"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <WifiOff className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-100">
                Tidak Ada Koneksi
              </p>
              <p className="text-xs font-medium text-white">
                Anda sedang tidak terhubung ke jaringan internet.
              </p>
            </div>
          </div>
          <span className="shrink-0 inline-flex items-center rounded-full bg-rose-800/60 px-2.5 py-1 text-[11px] font-semibold">
            Offline
          </span>
        </div>
      )}

      {/* Reconnected Online Alert */}
      {isOnline && showOnlineAlert && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-600 px-4 py-3 text-white shadow-2xl ring-4 ring-emerald-300/40 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Wifi className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                Koneksi Terhubung
              </p>
              <p className="text-xs font-medium text-white">
                Anda telah kembali online ke jaringan internet.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowOnlineAlert(false)}
            className="rounded-lg p-1.5 text-emerald-200 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
