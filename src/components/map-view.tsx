"use client";

import { useEffect, useRef, useState } from "react";

export interface KosanMapItem {
  id: string;
  nama: string;
  alamat: string;
  latitude: number | null;
  longitude: number | null;
  pemilik_name?: string;
  total_kamar?: number;
  total_penghuni?: number;
}

interface MapViewProps {
  kosanList: KosanMapItem[];
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  heightClass?: string;
}

const DEFAULT_LAT = 0.8228;
const DEFAULT_LNG = 127.3789;

function loadLeafletCDN(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if ((window as any).L) return Promise.resolve((window as any).L);

  if (!document.getElementById("leaflet-css")) {
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }

  return new Promise((resolve) => {
    const existingScript = document.getElementById("leaflet-js");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve((window as any).L));
      if ((window as any).L) resolve((window as any).L);
      return;
    }

    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve((window as any).L);
    document.body.appendChild(script);
  });
}

export function MapView({
  kosanList,
  centerLat = DEFAULT_LAT,
  centerLng = DEFAULT_LNG,
  zoom = 15,
  heightClass = "h-[500px]",
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      const L = await loadLeafletCDN();
      if (!isMounted || !mapContainerRef.current || !L) return;

      const customIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current).setView(
          [centerLat, centerLng],
          zoom
        );

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        const validKosan = kosanList.filter(
          (k) =>
            k.latitude !== null &&
            k.longitude !== null &&
            !isNaN(k.latitude) &&
            !isNaN(k.longitude)
        );

        const markers: any[] = [];

        validKosan.forEach((kosan) => {
          const marker = L.marker([kosan.latitude!, kosan.longitude!], {
            icon: customIcon,
          }).addTo(map);

          const popupContent = `
            <div style="font-family: system-ui, sans-serif; padding: 4px; min-width: 180px;">
              <h4 style="margin: 0 0 4px 0; font-weight: 700; color: #0f172a; font-size: 14px;">${kosan.nama}</h4>
              <p style="margin: 0 0 6px 0; color: #64748b; font-size: 12px;">📍 ${kosan.alamat}</p>
              ${kosan.pemilik_name ? `<p style="margin: 0 0 4px 0; color: #475569; font-size: 11px;">👤 Pemilik: <strong>${kosan.pemilik_name}</strong></p>` : ''}
              <div style="display: flex; gap: 8px; margin: 6px 0; font-size: 11px; color: #0d9488;">
                <span>🚪 ${kosan.total_kamar || 0} Kamar</span>
                <span>👥 ${kosan.total_penghuni || 0} Penghuni</span>
              </div>
              <div style="margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 6px; display: flex; justify-content: space-between; align-items: center;">
                <a href="/kosan/${kosan.id}" style="color: #0d9488; font-weight: 600; text-decoration: none; font-size: 12px;">Lihat Detail &rarr;</a>
                <a href="https://www.google.com/maps/dir/?api=1&destination=${kosan.latitude},${kosan.longitude}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; font-size: 11px; text-decoration: underline;">Petunjuk Arah</a>
              </div>
            </div>
          `;

          marker.bindPopup(popupContent);
          markers.push(marker);
        });

        if (markers.length > 1) {
          const group = L.featureGroup(markers);
          map.fitBounds(group.getBounds().pad(0.1));
        }

        mapInstanceRef.current = map;
        setMapLoaded(true);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [kosanList, centerLat, centerLng, zoom]);

  const mappedCount = kosanList.filter(
    (k) => k.latitude !== null && k.longitude !== null
  ).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          Menampilkan <strong>{mappedCount}</strong> dari {kosanList.length} kosan yang memiliki titik peta
        </span>
        <span className="text-primary-600">Wilayah: Kelurahan Akehuda, Ternate</span>
      </div>
      <div
        className={`relative w-full overflow-hidden rounded-2xl border border-gray-200 shadow-sm ${heightClass}`}
      >
        <div ref={mapContainerRef} className="h-full w-full z-10" />
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-sm text-gray-400">
            Memuat peta sebaran kosan...
          </div>
        )}
      </div>
    </div>
  );
}
