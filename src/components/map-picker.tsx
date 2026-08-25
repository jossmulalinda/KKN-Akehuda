"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Loader2 } from "lucide-react";

interface MapPickerProps {
  initialLat?: number | null;
  initialLng?: number | null;
  onChange: (coords: { lat: number; lng: number }) => void;
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

export function MapPicker({ initialLat, initialLng, onChange }: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat || DEFAULT_LAT,
    lng: initialLng || DEFAULT_LNG,
  });
  const [loadingGps, setLoadingGps] = useState(false);
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
          [coords.lat, coords.lng],
          16
        );

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        const marker = L.marker([coords.lat, coords.lng], {
          icon: customIcon,
          draggable: true,
        }).addTo(map);

        marker.on("dragend", () => {
          const position = marker.getLatLng();
          setCoords({ lat: position.lat, lng: position.lng });
          onChange({ lat: position.lat, lng: position.lng });
        });

        map.on("click", (e: any) => {
          marker.setLatLng(e.latlng);
          setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
          onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung geolokasi GPS.");
      return;
    }

    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        setCoords({ lat: newLat, lng: newLng });
        onChange({ lat: newLat, lng: newLng });

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([newLat, newLng], 17);
          markerRef.current.setLatLng([newLat, newLng]);
        }
        setLoadingGps(false);
      },
      (error) => {
        alert("Gagal mendeteksi lokasi: " + error.message);
        setLoadingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin className="h-4 w-4 text-primary-600" />
          <span>
            Koordinat: <strong className="text-gray-900">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={loadingGps}
          className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
        >
          {loadingGps ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Navigation className="h-3.5 w-3.5" />
          )}
          <span>{loadingGps ? "Mencari GPS..." : "📍 Ambil Lokasi Saya Sekarang"}</span>
        </button>
      </div>

      <div className="relative h-64 w-full overflow-hidden rounded-xl border border-gray-300 bg-gray-100 shadow-inner">
        <div ref={mapContainerRef} className="h-full w-full z-10" />
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-xs text-gray-400">
            Memuat peta Akehuda...
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400">
        💡 <em>Klik pada peta atau geser pin marker untuk menentukan titik letak kosan yang tepat.</em>
      </p>
    </div>
  );
}
