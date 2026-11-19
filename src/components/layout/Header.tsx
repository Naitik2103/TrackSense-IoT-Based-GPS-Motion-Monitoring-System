"use client";

import React, { useEffect, useState } from "react";
import { TrackerData, DashboardMode } from "@/types/tracker";
import { Navigation, Sun, Moon, Radio } from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface HeaderProps {
  data: TrackerData;
  isDark: boolean;
  onToggleTheme: () => void;
  mode: DashboardMode;
  onSelectMode: (mode: DashboardMode) => void;
}

export default function Header({
  data,
  isDark,
  onToggleTheme,
  mode,
  onSelectMode,
}: HeaderProps) {
  const [updatedStr, setUpdatedStr] = useState<string>("just now");

  useEffect(() => {
    const updateTime = () => {
      setUpdatedStr(timeAgo(data.timestamp));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [data.timestamp]);

  const isConnected = data.deviceStatus === "online";
  const gpsFix = data.gpsStatus === "valid" && (data.satellites >= 3 || data.latitude !== null);

  return (
    <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 py-3 transition-colors sticky top-0 z-20 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-xs">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-mono text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>SmartTrack</span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                IoT Tracker
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              GPS &amp; Motion Monitoring
            </p>
          </div>
        </div>

        {/* Status Indicators & Mode Switcher */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* ESP32 Connection Status (Section 2 & 6) */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                  : "bg-rose-500"
              }`}
            />
            <span className="text-slate-700 dark:text-slate-300 font-semibold">
              ESP32: {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          {/* GPS Fix Status (Section 3 & 6) */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                gpsFix
                  ? "bg-emerald-500"
                  : data.gpsStatus === "searching"
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
            />
            <span className="text-slate-700 dark:text-slate-300">
              GPS:{" "}
              <strong className="font-semibold capitalize">
                {gpsFix ? "Valid Fix" : data.gpsStatus === "searching" ? "Searching" : "Lost"}
              </strong>
            </span>
          </div>

          {/* Last Updated Timestamp (Section 6) */}
          <div className="hidden md:block text-xs font-mono text-slate-500 dark:text-slate-400">
            Updated: {updatedStr}
          </div>

          {/* Mode Selector (Live vs Demo) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono">
            <button
              onClick={() => onSelectMode("live")}
              className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                mode === "live"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>Live</span>
            </button>
            <button
              onClick={() => onSelectMode("demo")}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                mode === "demo"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>Demo</span>
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>
    </header>
  );
}
