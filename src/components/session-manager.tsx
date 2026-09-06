"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Batas inaktivitas: 2 Jam (120 Menit = 7.200.000 ms)
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 1000; // Cek setiap 30 detik
const STORAGE_KEY = "sikosan_last_active";

export function SessionManager() {
  const isLoggingOutRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    const handleAutoLogout = async () => {
      if (isLoggingOutRef.current) return;
      isLoggingOutRef.current = true;

      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Error signing out on timeout:", err);
      } finally {
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEY);
          window.location.href = "/login?timeout=1";
        }
      }
    };

    // Update timestamp saat user berinteraksi
    const updateActivity = () => {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
      }
    };

    // Cek status saat pertama kali render
    const initialLastActive = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const now = Date.now();

    if (initialLastActive) {
      const elapsed = now - parseInt(initialLastActive, 10);
      if (elapsed > INACTIVITY_TIMEOUT_MS) {
        handleAutoLogout();
        return;
      }
    }
    
    // Set awal aktivitas
    updateActivity();

    // Event listeners untuk mendeteksi aktivitas pengguna
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    let throttleTimer: NodeJS.Timeout | null = null;

    const throttledUpdate = () => {
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          updateActivity();
          throttleTimer = null;
        }, 5000); // Batasi update maksimal sekali tiap 5 detik agar hemat resource
      }
    };

    events.forEach((evt) => {
      window.addEventListener(evt, throttledUpdate, { passive: true });
    });

    // Interval pemeriksaan berkala
    const interval = setInterval(() => {
      const lastActiveStr = localStorage.getItem(STORAGE_KEY);
      if (lastActiveStr) {
        const lastActive = parseInt(lastActiveStr, 10);
        if (Date.now() - lastActive > INACTIVITY_TIMEOUT_MS) {
          handleAutoLogout();
        }
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, throttledUpdate);
      });
      if (throttleTimer) clearTimeout(throttleTimer);
      clearInterval(interval);
    };
  }, []);

  return null;
}
