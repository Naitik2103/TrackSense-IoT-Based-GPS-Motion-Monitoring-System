"use client";

import React, { useEffect, useState } from "react";
import { useTrackerData } from "@/hooks/useTrackerData";
import Header from "@/components/layout/Header";
import LiveMap from "@/components/map/LiveMap";
import GpsInformation from "@/components/tracker/GpsInformation";
import MovementStatus from "@/components/tracker/MovementStatus";
import { AlertCircle, CheckCircle2, Radio, WifiOff } from "lucide-react";

export default function SmartTrackDashboard() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(true);

  const { mode, setMode, trackerData } = useTrackerData();

  useEffect(() => {
    setMounted(true);
    // Apply dark mode class to html element
    document.documentElement.classList.add("dark");
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-mono text-xs gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-600 animate-pulse flex items-center justify-center text-white font-bold">
          ST
        </div>
        <div>Loading SmartTrack Dashboard...</div>
      </div>
    );
  }

  // Theme toggle
  const handleToggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const isConnected = trackerData.deviceStatus === "online";
  const hasGpsCoords = trackerData.latitude !== null && trackerData.longitude !== null;

  return (
    <div
      className={`min-h-screen transition-colors ${
        isDark ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* 1. Header (SmartTrack, Subtitle, Mode Switcher, Status) */}
      <Header
        data={trackerData}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        mode={mode}
        onSelectMode={setMode}
      />

      {/* 2. Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-5 space-y-4">
        {/* Status Notification Banner */}
        {mode === "demo" ? (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-mono">
            <Radio className="w-4 h-4 shrink-0 text-sky-500" />
            <span>
              <strong>Demo Mode (Sample Data):</strong> Showing simulated campus tracker movement. Switch to{" "}
              <strong>Live</strong> mode to receive actual telemetry from your ESP32 hardware via Firebase.
            </span>
          </div>
        ) : !isConnected ? (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-mono">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              <strong>Waiting for ESP32 Connection:</strong> Awaiting live packets from Firebase Realtime Database at{" "}
              <code>/devices/TRACKER01</code>. Power on your ESP32 to stream live sensor telemetry.
            </span>
          </div>
        ) : !hasGpsCoords ? (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 text-sky-500" />
            <span>
              <strong>ESP32 Connected (Firebase RTDB):</strong> Receiving MPU6050 motion sensor telemetry. GPS is searching for satellites (indoor testing).
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>
              <strong>Live Telemetry Stream Active:</strong> ESP32 connected to Firebase Realtime Database &amp; valid GPS fix acquired.
            </span>
          </div>
        )}

        {/* 3. Main Dashboard Grid (Map on Left, Sensors on Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Live Location Map (Leaflet + OpenStreetMap) - 7 Columns on Desktop */}
          <section className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Live Location Map (OpenStreetMap)
              </h2>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Device ID: {trackerData.deviceId || "TRACKER01"}
              </span>
            </div>

            {/* Live Leaflet Map Component */}
            <LiveMap data={trackerData} isDark={isDark} />
          </section>

          {/* Right Column: GPS & MPU6050 Sensor Panels - 5 Columns on Desktop */}
          <section className="lg:col-span-5 space-y-5">
            {/* GPS Information Component */}
            <GpsInformation data={trackerData} />

            {/* MPU6050 Movement Status Component */}
            <MovementStatus data={trackerData} />
          </section>
        </div>

        {/* 4. Minimal Professional Footer */}
        <footer className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs font-mono text-slate-500 dark:text-slate-400">
          SmartTrack IoT Asset Tracker &bull; ESP32-WROOM-32 &bull; NEO-6M GPS &bull; MPU6050 IMU &bull; MQTT &bull; Leaflet OSM
        </footer>
      </main>
    </div>
  );
}
