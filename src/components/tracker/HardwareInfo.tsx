"use client";

import React from "react";
import { TrackerData } from "@/types/tracker";
import {
  Cpu,
  Radio,
  Battery,
  Shield,
  Layers,
  Zap,
  Wifi,
  Satellite,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface HardwareInfoProps {
  data: TrackerData;
}

export default function HardwareInfo({ data }: HardwareInfoProps) {
  const hasValidFix = data.gpsStatus === "valid" && data.satellites >= 4;

  const specs = [
    {
      label: "Tracker ID",
      value: data.deviceId,
      icon: Shield,
      highlight: true,
      sub: "Asset Tag #01",
    },
    {
      label: "Device MCU",
      value: "ESP32-WROOM-32",
      icon: Cpu,
      sub: "240MHz Dual-Core",
    },
    {
      label: "GPS Module",
      value: "NEO-6M",
      icon: Satellite,
      sub: "u-blox UART 9600 baud",
    },
    {
      label: "Motion Sensor",
      value: "MPU6050",
      icon: Layers,
      sub: "6-Axis I2C Accel/Gyro",
    },
    {
      label: "Connection",
      value: "Wi-Fi (802.11 b/g/n)",
      icon: Wifi,
      sub: data.wifiRssi !== null ? `${data.wifiSsid || "Campus_IoT_WLAN"} (${data.wifiRssi} dBm)` : "Connected",
    },
    {
      label: "Communication",
      value: "MQTT",
      icon: Radio,
      sub: "tracker/# (QoS 1)",
    },
    {
      label: "Power Source",
      value: "Li-ion Battery",
      icon: Battery,
      sub:
        data.batteryPercentage !== null
          ? `${data.batteryPercentage}% ${data.batteryVoltage !== null ? `(${data.batteryVoltage.toFixed(2)}V)` : ""}`
          : "N/A (Unmeasured)",
    },
    {
      label: "GPS Status",
      value: hasValidFix ? "Valid Fix" : data.gpsStatus === "searching" ? "Searching" : "No Fix",
      icon: hasValidFix ? CheckCircle : AlertCircle,
      statusColor: hasValidFix ? "text-emerald-500" : "text-amber-500",
      sub: `${data.satellites} Sats (HDOP ${data.hdop > 0 ? data.hdop.toFixed(1) : "—"})`,
    },
  ];

  const mosfetLabel =
    data.gpsPower === true
      ? "GPS Power ON"
      : data.gpsPower === false
      ? "GPS Power OFF"
      : "ACTIVE";

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
            Hardware & Subsystems Specification
          </h3>
        </div>
        {/* MOSFET Power Gating Indicator (Step 17) */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/80 text-[11px] font-mono text-sky-700 dark:text-sky-300">
          <Zap className="w-3 h-3 text-sky-500" />
          <span>MOSFET Power Gate: {mosfetLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {specs.map((spec, i) => {
          const Icon = spec.icon;
          return (
            <div
              key={i}
              className="p-3 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                  {spec.label}
                </span>
                <Icon className={`w-3.5 h-3.5 ${spec.statusColor || "text-slate-400"}`} />
              </div>
              <div>
                <div
                  className={`text-sm font-bold font-mono ${
                    spec.highlight
                      ? "text-sky-600 dark:text-sky-400"
                      : "text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {spec.value}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                  {spec.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Engineering Project Note */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
        <span>MOSFET Gate Logic: GPS powered down during idle sleep to conserve battery.</span>
        <span className="text-slate-400">Firmware: v1.4.2-esp32</span>
      </div>
    </div>
  );
}
