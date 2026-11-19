"use client";

import React, { useEffect, useState } from "react";
import { TrackerData } from "@/types/tracker";
import { MapPin, Activity, Satellite, Cpu, Wifi, BatteryCharging, CheckCircle2 } from "lucide-react";
import { formatCoordinate, timeAgo, getHdopQuality } from "@/lib/utils";

interface OverviewCardsProps {
  data: TrackerData;
}

export default function OverviewCards({ data }: OverviewCardsProps) {
  const [lastUpdated, setLastUpdated] = useState<string>("just now");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdated(timeAgo(data.timestamp));
    }, 1000);
    return () => clearInterval(timer);
  }, [data.timestamp]);

  const hdopQuality = getHdopQuality(data.hdop);
  const hasValidCoordinates = data.latitude !== null && data.longitude !== null;

  const handleCopyCoords = () => {
    if (!hasValidCoordinates) return;
    const str = `${data.latitude?.toFixed(6)}, ${data.longitude?.toFixed(6)}`;
    navigator.clipboard.writeText(str);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasValidFix = data.gpsStatus === "valid" && data.satellites >= 4;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
      {/* 1. LOCATION CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm relative group hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-sky-500" />
            Location
          </span>
          <button
            onClick={handleCopyCoords}
            disabled={!hasValidCoordinates}
            title={hasValidCoordinates ? "Copy coordinates" : "Coordinates unavailable"}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            {copied ? (
              <span className="text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Copied
              </span>
            ) : (
              "Copy"
            )}
          </button>
        </div>

        <div className="space-y-1">
          <div className="flex items-baseline justify-between font-mono">
            <span className="text-xs text-slate-400">Lat:</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatCoordinate(data.latitude, 6)}
            </span>
          </div>
          <div className="flex items-baseline justify-between font-mono">
            <span className="text-xs text-slate-400">Lon:</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatCoordinate(data.longitude, 6)}
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
          <span>Alt: {data.altitude !== null ? `${data.altitude.toFixed(1)} m` : "—"}</span>
          <span>{data.speed ? `${data.speed.toFixed(1)} km/h` : "Stationary"}</span>
        </div>
      </div>

      {/* 2. MOVEMENT CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm relative hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            Movement
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              data.movement ? "bg-emerald-500 animate-ping" : "bg-slate-400"
            }`}
          />
        </div>

        <div className="mb-1">
          <div
            className={`text-base font-bold tracking-tight ${
              data.movement
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-700 dark:text-slate-200"
            }`}
          >
            {data.movement ? "Movement Detected" : "Stable"}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {data.movement ? "Tracker is moving" : "No significant movement"}
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
          <span>MPU6050</span>
          <span>
            {(
              Math.sqrt(
                data.acceleration.x ** 2 + data.acceleration.y ** 2 + data.acceleration.z ** 2
              )
            ).toFixed(2)}{" "}
            m/s²
          </span>
        </div>
      </div>

      {/* 3. GPS CARD (Step 9) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm relative hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
            <Satellite className="w-3.5 h-3.5 text-sky-500" />
            GPS Status
          </span>
          <span
            className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded uppercase ${
              hasValidFix
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : data.gpsStatus === "searching"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
            }`}
          >
            {hasValidFix ? "Valid Fix" : data.gpsStatus === "searching" ? "Searching" : "No Fix"}
          </span>
        </div>

        <div className="mb-1">
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {hasValidFix ? `${data.satellites} Satellites` : "GPS Searching"}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
            <span>NEO-6M</span>
            <span>&bull;</span>
            {hasValidFix ? (
              <span className={hdopQuality.color}>HDOP {data.hdop.toFixed(1)}</span>
            ) : (
              <span className="text-amber-500">0 Satellites</span>
            )}
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
          <span>{hasValidFix ? "Lock: 3D Fix" : "No valid location"}</span>
          <span className="text-sky-500 dark:text-sky-400">
            {data.gpsPower === true
              ? "GPS Power ON"
              : data.gpsPower === false
              ? "GPS Power OFF"
              : "MOSFET Active"}
          </span>
        </div>
      </div>

      {/* 4. DEVICE CARD (Step 5 & 16) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm relative hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
            Device
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                data.deviceStatus === "online"
                  ? "bg-emerald-500"
                  : data.deviceStatus === "connecting"
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
            />
            <span
              className={`text-xs font-semibold capitalize ${
                data.deviceStatus === "online"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : data.deviceStatus === "connecting"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {data.deviceStatus}
            </span>
          </div>
        </div>

        <div className="mb-1">
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight font-mono">
            {data.deviceId}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
            Updated {lastUpdated}
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <BatteryCharging className="w-3 h-3 text-emerald-500" />
            {data.batteryPercentage !== null
              ? `${data.batteryPercentage}%`
              : "N/A"}{" "}
            {data.batteryVoltage !== null ? `(${data.batteryVoltage.toFixed(2)}V)` : ""}
          </span>
          <span className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-sky-500" />
            {data.wifiRssi !== null ? `${data.wifiRssi} dBm` : "Wi-Fi"}
          </span>
        </div>
      </div>
    </div>
  );
}
