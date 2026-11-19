"use client";

import React from "react";
import { TrackerData } from "@/types/tracker";
import { Activity, ShieldCheck } from "lucide-react";

interface MovementStatusProps {
  data: TrackerData;
}

export default function MovementStatus({ data }: MovementStatusProps) {
  const { x, y, z } = data.acceleration;
  const netAccel = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
  const netG = netAccel / 9.80665;

  // Percentage calculations for visual horizontal indicators (range -10 to +10 m/s^2 for X/Y, 0 to 20 for Z)
  // X and Y are centered at 50% (0 m/s^2)
  const xOffset = Math.min(50, Math.max(-50, (x / 10) * 50));
  const yOffset = Math.min(50, Math.max(-50, (y / 10) * 50));
  // Z is relative to earth gravity (9.8 m/s^2 at center)
  const zOffset = Math.min(50, Math.max(-50, ((z - 9.81) / 10) * 50));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Motion Sensor (MPU6050)
          </h2>
        </div>

        {/* Movement Status: Moving / Stationary */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              data.movement
                ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] animate-pulse"
                : "bg-slate-400 dark:bg-slate-500"
            }`}
          />
          <span
            className={`font-semibold ${
              data.movement
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            {data.movement ? "Moving" : "Stationary"}
          </span>
        </div>
      </div>

      {/* Movement Banner & Net G */}
      <div
        className={`p-3 rounded-lg border mb-4 flex items-center justify-between transition-colors ${
          data.movement
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
            : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
          <div>
            <div className="text-xs font-bold font-mono">
              {data.movement ? "Movement Detected" : "Tracker is Stable"}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {data.movement ? "Accelerometer threshold exceeded" : "No significant displacement"}
            </div>
          </div>
        </div>

        <div className="text-right font-mono">
          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
            {netAccel.toFixed(2)} m/s²
          </div>
          <div className="text-[10px] text-slate-400">
            {netG.toFixed(2)} g net
          </div>
        </div>
      </div>

      {/* Linear Acceleration 3-Axis Meters */}
      <div className="space-y-3 font-mono">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
          <span>Linear Acceleration</span>
          <span>m/s²</span>
        </div>

        {/* X Axis */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">X-Axis:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {x > 0 ? `+${x.toFixed(2)}` : x.toFixed(2)} m/s²
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden relative">
            {/* Center tick at 50% */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-300 dark:bg-slate-600 -translate-x-1/2" />
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                Math.abs(x) > 1.5 ? "bg-amber-500" : "bg-sky-500"
              }`}
              style={{
                width: `${Math.abs(xOffset)}%`,
                marginLeft: xOffset >= 0 ? "50%" : `${50 + xOffset}%`,
              }}
            />
          </div>
        </div>

        {/* Y Axis */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Y-Axis:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {y > 0 ? `+${y.toFixed(2)}` : y.toFixed(2)} m/s²
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden relative">
            {/* Center tick at 50% */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-300 dark:bg-slate-600 -translate-x-1/2" />
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                Math.abs(y) > 1.5 ? "bg-amber-500" : "bg-sky-500"
              }`}
              style={{
                width: `${Math.abs(yOffset)}%`,
                marginLeft: yOffset >= 0 ? "50%" : `${50 + yOffset}%`,
              }}
            />
          </div>
        </div>

        {/* Z Axis (Includes Earth Gravity 9.81 m/s^2) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Z-Axis (Gravity):</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {z > 0 ? `+${z.toFixed(2)}` : z.toFixed(2)} m/s²
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden relative">
            {/* Baseline tick at 50% represents 9.81 m/s^2 */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-300 dark:bg-slate-600 -translate-x-1/2" />
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                Math.abs(z - 9.81) > 2 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{
                width: `${Math.abs(zOffset)}%`,
                marginLeft: zOffset >= 0 ? "50%" : `${50 + zOffset}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
