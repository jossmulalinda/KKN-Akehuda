"use client";

import { useEffect, useRef, useState } from "react";

export interface KosanMapItem {
  id: string;
  nama: string;
  alamat: string;
  latitude: number | null;
  longitude: number | null;
  pemilik_name?: string;
  kode_unik?: string;
  total_kamar?: number;
  total_penghuni?: number;
}

export interface MapViewProps {
  kosanList: KosanMapItem[];
  selectedKosanId?: string | null;
  onSelectKosan?: (id: string) => void;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  heightClass?: string;
  searchQuery?: string;
}

const DEFAULT_LAT = 0.823139;
const DEFAULT_LNG = 127.3853289;

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
  selectedKosanId = null,
  onSelectKosan,
  centerLat = DEFAULT_LAT,
  centerLng = DEFAULT_LNG,
  zoom = 16,
  heightClass = "aspect-square md:aspect-auto md:h-[480px]",
  searchQuery = "",
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, any>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);

  // 1. Initialize Map
  useEffect(() => {
    let isMounted = true;

    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    const initMap = async () => {
      const L = await loadLeafletCDN();
      if (!isMounted || !mapContainerRef.current || !L) return;

      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
        }).setView([centerLat, centerLng], zoom);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        const markersLayer = L.featureGroup().addTo(map);
        markersLayerRef.current = markersLayer;
        mapInstanceRef.current = map;
        setMapLoaded(true);

        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 250);
      }
    };

    window.addEventListener("resize", handleResize);
    initMap();

    return () => {
      isMounted = false;
      window.removeEventListener("resize", handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        markersMapRef.current.clear();
      }
    };
  }, [centerLat, centerLng, zoom]);

  // 2. Render Custom Modern Markers when kosanList / selectedKosanId changes
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !markersLayerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;

    // Clear previous markers
    markersLayer.clearLayers();
    markersMapRef.current.clear();

    const validKosan = kosanList.filter(
      (k) =>
        k.latitude !== null &&
        k.longitude !== null &&
        !isNaN(k.latitude) &&
        !isNaN(k.longitude)
    );

    validKosan.forEach((kosan) => {
      const isSelected = selectedKosanId === kosan.id;

      // Modern Custom Pin HTML
      const pinHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <!-- Pin Icon Badge -->
          <div style="
            position: relative;
            width: ${isSelected ? "38px" : "32px"};
            height: ${isSelected ? "38px" : "32px"};
            border-radius: 12px;
            background: ${isSelected ? "linear-gradient(135deg, #047857, #10b981)" : "linear-gradient(135deg, #0f766e, #0d9488)"};
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            box-shadow: 0 ${isSelected ? "6px 18px rgba(16,185,129,0.5)" : "3px 10px rgba(13,148,136,0.35)"};
            border: 2px solid #ffffff;
            transition: all 0.25s ease;
          ">
            <svg style="width: ${isSelected ? "20px" : "16px"}; height: ${isSelected ? "20px" : "16px"};" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <!-- Pin Tail Arrow -->
          <div style="
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 5px solid ${isSelected ? "#047857" : "#0f766e"};
          "></div>
          <!-- Label Pill Under Pin -->
          <div style="
            margin-top: 3px;
            background: ${isSelected ? "#064e3b" : "rgba(15, 23, 42, 0.9)"};
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 6px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.25);
            white-space: nowrap;
            max-width: 130px;
            overflow: hidden;
            text-overflow: ellipsis;
            border: 1px solid rgba(255,255,255,0.2);
            text-align: center;
          ">
            ${kosan.nama}
          </div>
        </div>
      `;

      const customDivIcon = L.divIcon({
        className: "custom-leaflet-kosan-pin",
        html: pinHtml,
        iconSize: [36, 52],
        iconAnchor: [18, 37],
        popupAnchor: [0, -38],
      });

      const marker = L.marker([kosan.latitude!, kosan.longitude!], {
        icon: customDivIcon,
      });

      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 3px; min-width: 220px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="background: #ccfbf1; color: #0f766e; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px; border: 1px solid #99f6e4;">KOSAN TERDATA</span>
            ${kosan.kode_unik ? `<span style="font-size: 10.5px; font-family: monospace; color: #0f766e; font-weight: 700; background: #f0fdfa; padding: 1px 5px; border-radius: 4px;">#${kosan.kode_unik}</span>` : ''}
          </div>
          <h4 style="margin: 0 0 3px 0; font-weight: 700; color: #0f172a; font-size: 15px; line-height: 1.2;">${kosan.nama}</h4>
          <p style="margin: 0 0 5px 0; color: #64748b; font-size: 12px; line-height: 1.3;">📍 ${kosan.alamat}</p>
          ${kosan.pemilik_name ? `<p style="margin: 0 0 6px 0; color: #334155; font-size: 11.5px;">👤 Pemilik: <strong>${kosan.pemilik_name}</strong></p>` : ''}
          <div style="display: flex; gap: 8px; margin: 8px 0; font-size: 11px; background: #f8fafc; padding: 6px 8px; border-radius: 8px; border: 1px solid #f1f5f9;">
            <span style="color: #0f766e; font-weight: 600;">🚪 ${kosan.total_kamar || 0} Kamar</span>
            <span style="color: #cbd5e1;">•</span>
            <span style="color: #0369a1; font-weight: 600;">👥 ${kosan.total_penghuni || 0} Penghuni</span>
          </div>
          <div style="margin-top: 10px; display: flex; gap: 6px;">
            <a href="/kosan/${kosan.id}" style="flex: 1; text-align: center; background: #0d9488; color: white; padding: 6px 10px; border-radius: 8px; font-weight: 600; font-size: 11.5px; text-decoration: none; box-shadow: 0 2px 4px rgba(13,148,136,0.2);">Lihat Detail &rarr;</a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${kosan.latitude},${kosan.longitude}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; background: #eff6ff; color: #2563eb; padding: 6px 10px; border-radius: 8px; font-weight: 600; font-size: 11.5px; text-decoration: none; border: 1px solid #bfdbfe;">Rute</a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on("click", () => {
        if (onSelectKosan) {
          onSelectKosan(kosan.id);
        }
      });

      markersLayer.addLayer(marker);
      markersMapRef.current.set(kosan.id, { marker, kosan });
    });

    // 3. Search / Selection Reactive Viewport adjustment
    if (selectedKosanId && markersMapRef.current.has(selectedKosanId)) {
      const selected = markersMapRef.current.get(selectedKosanId);
      map.flyTo([selected.kosan.latitude, selected.kosan.longitude], 18, {
        duration: 0.9,
      });
      selected.marker.openPopup();
    } else if (searchQuery.trim() !== "" && validKosan.length > 0) {
      if (validKosan.length === 1) {
        const onlyOne = validKosan[0];
        map.flyTo([onlyOne.latitude, onlyOne.longitude], 18, { duration: 0.9 });
        const targetMarker = markersMapRef.current.get(onlyOne.id);
        if (targetMarker) {
          targetMarker.marker.openPopup();
        }
      } else {
        map.fitBounds(markersLayer.getBounds().pad(0.15));
      }
    } else if (validKosan.length > 1) {
      map.fitBounds(markersLayer.getBounds().pad(0.1));
    }
  }, [kosanList, selectedKosanId, searchQuery, mapLoaded, onSelectKosan]);

  const mappedCount = kosanList.filter(
    (k) => k.latitude !== null && k.longitude !== null
  ).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-teal-500"></span>
          Menampilkan <strong>{mappedCount}</strong> titik kosan di peta
        </span>
        <span className="text-teal-700 font-semibold">Kelurahan Akehuda, Ternate</span>
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
