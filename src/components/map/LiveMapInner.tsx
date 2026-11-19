"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { TrackerData } from "@/types/tracker";
import { ExternalLink, LocateFixed, ZoomIn, ZoomOut } from "lucide-react";
import { formatCoordinate, getGoogleMapsUrl } from "@/lib/utils";

interface LiveMapInnerProps {
  data: TrackerData;
  isDark?: boolean;
}

export default function LiveMapInner({ data, isDark = true }: LiveMapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const firstFixRef = useRef<boolean>(false);

  const [autoCenter, setAutoCenter] = useState<boolean>(true);

  const hasCoords = data.latitude !== null && data.longitude !== null;
  const currentLat = data.latitude ?? 23.187574;
  const currentLng = data.longitude ?? 72.626864;

  const gMapsUrl = getGoogleMapsUrl(data.latitude, data.longitude);

  // 1. Initialize Leaflet Map with standard OpenStreetMap (NO API KEY REQUIRED)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [currentLat, currentLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: true,
    });

    // Standard OpenStreetMap tiles - completely free, reliable, no API key watermark
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Marker
    const markerIcon = createTrackerMarkerIcon(data);
    const marker = L.marker([currentLat, currentLng], {
      icon: markerIcon,
      zIndexOffset: 1000,
      opacity: hasCoords ? 1 : 0.6,
    }).addTo(map);

    marker.bindPopup(createPopupContent(data));
    markerRef.current = marker;

    // Accuracy Circle based on HDOP
    const accuracy = hasCoords ? Math.max(8, (data.hdop || 1.5) * 6) : 0;
    const circle = L.circle([currentLat, currentLng], {
      radius: accuracy,
      color: "#0284c7",
      weight: 1.5,
      opacity: 0.7,
      fillColor: "#0284c7",
      fillOpacity: 0.12,
    }).addTo(map);
    accuracyCircleRef.current = circle;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Update Marker & Accuracy Circle Dynamically Without Reloading Map
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    const map = mapInstanceRef.current;

    if (!hasCoords) {
      markerRef.current.setOpacity(0.4);
      markerRef.current.setPopupContent(createPopupContent(data));
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setRadius(0);
      }
      return;
    }

    const latLng: [number, number] = [data.latitude!, data.longitude!];

    // Update marker position & icon
    markerRef.current.setOpacity(1.0);
    markerRef.current.setLatLng(latLng);
    markerRef.current.setIcon(createTrackerMarkerIcon(data));
    markerRef.current.setPopupContent(createPopupContent(data));

    // Update accuracy circle
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng(latLng);
      const accuracy = data.gpsStatus === "lost" ? 0 : Math.max(8, (data.hdop || 1.5) * 6);
      accuracyCircleRef.current.setRadius(accuracy);
      accuracyCircleRef.current.setStyle({
        color: data.movement ? "#10b981" : "#0284c7",
        fillColor: data.movement ? "#10b981" : "#0284c7",
      });
    }

    // Auto-center on initial coordinate fix or if autoCenter is toggled
    if (!firstFixRef.current) {
      firstFixRef.current = true;
      map.flyTo(latLng, 17, { animate: true, duration: 1.0 });
    } else if (autoCenter) {
      map.panTo(latLng, { animate: true, duration: 0.6 });
    }
  }, [data.latitude, data.longitude, data.movement, data.deviceStatus, data.gpsStatus, autoCenter]);

  // Recenter handler
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    setAutoCenter(true);
    mapInstanceRef.current.flyTo([currentLat, currentLng], 17, {
      animate: true,
      duration: 0.8,
    });
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  return (
    <div className="relative w-full h-[460px] md:h-[540px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-100 dark:bg-slate-900">
      {/* Map Leaflet Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Control Buttons (Top Right) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 pointer-events-auto">
        <button
          onClick={handleRecenter}
          title="Recenter on Tracker"
          className="w-8 h-8 bg-white/95 dark:bg-slate-900/95 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center shadow-md transition-colors"
        >
          <LocateFixed className="w-4 h-4 text-sky-500" />
        </button>
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-8 h-8 bg-white/95 dark:bg-slate-900/95 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center shadow-md transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-8 h-8 bg-white/95 dark:bg-slate-900/95 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center shadow-md transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Waiting State Banner (When in Live Mode without coordinates) */}
      {!hasCoords && (
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
          <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 backdrop-blur-md text-amber-700 dark:text-amber-300 text-xs font-mono font-medium shadow flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Waiting for GPS fix from NEO-6M...</span>
          </div>
        </div>
      )}

      {/* Bottom Floating Bar: Open in Google Maps + Live HUD */}
      <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-auto flex flex-wrap items-center justify-between gap-2">
        {/* Open in Google Maps Link (dynamically generated) */}
        {gMapsUrl ? (
          <a
            href={gMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 hover:bg-sky-600 dark:hover:bg-sky-600 text-slate-800 dark:text-slate-200 hover:text-white dark:hover:text-white border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold shadow-md transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-sky-500" />
            <span>Open in Google Maps</span>
          </a>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/70 dark:bg-slate-900/70 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium cursor-not-allowed shadow-sm">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in Google Maps (Waiting for Fix)</span>
          </div>
        )}

        {/* Live Coordinate Badges */}
        <div className="flex items-center gap-3 px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono shadow-md text-slate-700 dark:text-slate-200">
          <div>
            <span className="text-slate-400 dark:text-slate-500 mr-1">LAT:</span>
            <span className="font-semibold text-sky-600 dark:text-sky-400">
              {data.latitude !== null ? formatCoordinate(data.latitude, 6) : "—"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 mr-1">LON:</span>
            <span className="font-semibold text-sky-600 dark:text-sky-400">
              {data.longitude !== null ? formatCoordinate(data.longitude, 6) : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper: Custom Leaflet Marker Icon
function createTrackerMarkerIcon(data: TrackerData): L.DivIcon {
  const isOnline = data.deviceStatus === "online";
  const isMoving = data.movement;

  let pinColor = "bg-sky-600";
  let ringColor = "border-sky-500";

  if (!isOnline) {
    pinColor = "bg-rose-500";
    ringColor = "border-rose-400";
  } else if (isMoving) {
    pinColor = "bg-emerald-600";
    ringColor = "border-emerald-400";
  }

  const html = `
    <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
      <!-- Outer pulsing ring -->
      <div class="absolute w-9 h-9 rounded-full ${ringColor} border opacity-75 animate-ping"></div>
      
      <!-- Center Pin Core -->
      <div class="relative w-7 h-7 rounded-full ${pinColor} text-white shadow-lg flex items-center justify-center border-2 border-white dark:border-slate-900 cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>

      <!-- Badge Label -->
      <div class="absolute top-8 px-1.5 py-0.5 rounded bg-slate-900/90 text-white text-[10px] font-mono font-bold shadow whitespace-nowrap pointer-events-none">
        ${data.deviceId || "TRACKER01"}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-tracker-pin",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -18],
  });
}

// Helper: Popup Content with Lat/Lon & Google Maps Link
function createPopupContent(data: TrackerData): string {
  const gMapsUrl = getGoogleMapsUrl(data.latitude, data.longitude);
  const latStr = data.latitude !== null ? data.latitude.toFixed(6) : "Searching...";
  const lonStr = data.longitude !== null ? data.longitude.toFixed(6) : "Searching...";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #0f172a; min-width: 170px;">
      <div style="font-weight: 700; font-family: monospace; font-size: 13px; color: #0284c7; margin-bottom: 4px;">
        ${data.deviceId || "TRACKER01"}
      </div>
      <div style="font-family: monospace; font-size: 11px; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 4px;">
        <div><strong>Status:</strong> <span style="color: ${data.deviceStatus === "online" ? "#10b981" : "#ef4444"}; text-transform: capitalize;">${data.deviceStatus}</span></div>
        <div><strong>GPS:</strong> ${data.gpsStatus === "valid" ? "Valid Fix" : "Searching"}</div>
        <div style="margin-top: 4px;"><strong>Latitude:</strong> ${latStr}</div>
        <div><strong>Longitude:</strong> ${lonStr}</div>
        <div><strong>Satellites:</strong> ${data.satellites}</div>
        ${data.altitude !== null ? `<div><strong>Altitude:</strong> ${data.altitude.toFixed(1)} m</div>` : ""}
      </div>
      ${
        gMapsUrl
          ? `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; text-align: center;">
              <a href="${gMapsUrl}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; text-decoration: none; font-weight: 600; font-size: 11px;">
                Open in Google Maps &rarr;
              </a>
            </div>`
          : ""
      }
    </div>
  `;
}
