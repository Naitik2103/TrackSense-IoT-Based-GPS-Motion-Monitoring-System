"use client";

import React from "react";
import { TrackerData } from "@/types/tracker";
import { Satellite, Compass, Layers } from "lucide-react";
import { formatCoordinate, getHdopQuality } from "@/lib/utils";

interface GpsInformationProps {
  data: TrackerData;
}

export default function GpsInformation({ data }: GpsInformationProps) {
  const hasValidFix = data.gpsStatus === "valid" && (data.satellites >= 3 || data.latitude !== null);
  const hdopQuality = getHdopQuality(data.hdop);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Satellite className="w-4 h-4 text-sky-500" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            GPS Information (NEO-6M)
          </h2>
        </div>

        {/* GPS Status: Valid Fix / Searching / Lost */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              hasValidFix
                ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                : data.gpsStatus === "searching"
                ? "bg-amber-500"
                : "bg-rose-500"
            }`}
          />
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {hasValidFix ? "Valid Fix" : data.gpsStatus === "searching" ? "Searching..." : "Lost"}
          </span>
        </div>
      </div>

      {/* Sensor Readings Grid */}
      <div className="grid grid-cols-2 gap-3 font-mono">
        {/* Latitude */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
            Latitude
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
            {data.latitude !== null ? `${formatCoordinate(data.latitude, 6)}° N` : "—"}
          </div>
        </div>

        {/* Longitude */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
            Longitude
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
            {data.longitude !== null ? `${formatCoordinate(data.longitude, 6)}° E` : "—"}
          </div>
        </div>

        {/* Altitude */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
            Altitude
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
            {data.altitude !== null ? `${data.altitude.toFixed(1)} m` : "—"}
          </div>
        </div>

        {/* Satellite Count */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
            Satellites
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center justify-between">
            <span>{data.satellites} Locked</span>
            {/* Visual satellite bar indicator */}
            <div className="flex gap-0.5 items-end h-3.5">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={`w-1 rounded-xs transition-colors ${
                    data.satellites >= bar * 2
                      ? "bg-sky-500"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                  style={{ height: `${bar * 25}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* HDOP */}
        <div className="col-span-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
              HDOP (Horizontal Dilution of Precision)
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              {data.hdop > 0 ? data.hdop.toFixed(2) : "—"}
            </div>
          </div>
          {data.hdop > 0 && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${hdopQuality.color} bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700`}>
              {hdopQuality.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
