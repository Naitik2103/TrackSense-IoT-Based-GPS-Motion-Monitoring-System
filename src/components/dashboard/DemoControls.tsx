"use client";

import React, { useState } from "react";
import { TrackerData, DashboardMode } from "@/types/tracker";
import {
  FlaskConical,
  Play,
  Pause,
  AlertTriangle,
  WifiOff,
  BatteryCharging,
  Zap,
  Code2,
  ChevronDown,
  ChevronUp,
  Radio,
  Send,
} from "lucide-react";

interface DemoControlsProps {
  data: TrackerData;
  mode: DashboardMode;
  onToggleDemo: (mode: DashboardMode) => void;
  rawMqttPayload: Record<string, any> | null;
  onSimulateMotion?: () => void;
  onSimulateGpsLoss?: () => void;
  onSimulateConnection?: () => void;
  onSimulateLowBattery?: () => void;
  onPublishTestFrame?: (payload?: any) => Promise<any>;
}

export default function DemoControls({
  data,
  mode,
  onToggleDemo,
  rawMqttPayload,
  onSimulateMotion,
  onSimulateGpsLoss,
  onSimulateConnection,
  onSimulateLowBattery,
  onPublishTestFrame,
}: DemoControlsProps) {
  const [showJson, setShowJson] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Payload format matching Step 2
  const displayPayload =
    rawMqttPayload ||
    (mode === "live"
      ? {
          status: "AWAITING_TELEMETRY",
          message:
            "Waiting for first MQTT message from ESP32 on broker (broker.hivemq.com:1883)...",
          topic: "tracker/location",
          device_id: data.deviceId || "TRACKER01",
          note: "No synthetic or mock values are displayed in Live Mode.",
        }
      : {
          device_id: data.deviceId,
          latitude: data.latitude,
          longitude: data.longitude,
          altitude: data.altitude,
          satellites: data.satellites,
          hdop: data.hdop,
          gps_status: data.gpsStatus,
          movement: data.movement,
          acceleration: {
            x: data.acceleration.x,
            y: data.acceleration.y,
            z: data.acceleration.z,
          },
          battery_percentage: data.batteryPercentage,
          battery_voltage: data.batteryVoltage,
          wifi_rssi: data.wifiRssi,
          gps_power: data.gpsPower,
          timestamp: data.timestamp,
        });

  const handleSendTestFrame = async () => {
    if (!onPublishTestFrame) return;
    setPublishing(true);
    try {
      const latOffset = (Math.random() - 0.5) * 0.0002;
      const lonOffset = (Math.random() - 0.5) * 0.0002;
      const testFrame = {
        device_id: data.deviceId || "TRACKER01",
        latitude: +(23.1905 + latOffset).toFixed(6),
        longitude: +(72.628 + lonOffset).toFixed(6),
        altitude: 54.2,
        satellites: 8,
        hdop: 1.2,
        gps_status: "valid",
        movement: Math.random() > 0.5,
        acceleration: {
          x: +(Math.random() * 0.2 - 0.1).toFixed(2),
          y: +(Math.random() * 0.2 - 0.1).toFixed(2),
          z: +(9.66 + Math.random() * 0.1).toFixed(2),
        },
        battery_percentage: 86,
        battery_voltage: 4.09,
        wifi_rssi: -64,
        gps_power: true,
        timestamp: new Date().toISOString(),
      };
      await onPublishTestFrame(testFrame);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-sm text-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            Developer & Professor Evaluation Tools
          </span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
              mode === "live"
                ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                : "bg-sky-950 text-sky-300 border-sky-800"
            }`}
          >
            {mode === "live" ? "Live Mode: BACKEND CONNECTED" : "Demo Mode: ACTIVE"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <button
            onClick={() => onToggleDemo(mode === "demo" ? "live" : "demo")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-semibold transition-colors ${
              mode === "demo"
                ? "bg-sky-600 hover:bg-sky-500 text-white"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            {mode === "demo" ? (
              <>
                <Radio className="w-3 h-3" />
                <span>Switch to Live</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>Switch to Demo</span>
              </>
            )}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            title="Expand/Collapse Dev Panel"
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-3 pt-3 border-t border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-[11px] text-slate-400">
              {mode === "demo" ? "Simulation Injections:" : "Live Testing Actions:"}
            </span>

            {mode === "demo" ? (
              <>
                <button
                  onClick={onSimulateMotion}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded flex items-center gap-1 text-[11px] transition-colors"
                  title="Triggers MPU6050 motion wake-up interrupt"
                >
                  <Zap className="w-3 h-3" />
                  <span>Motion Burst</span>
                </button>

                <button
                  onClick={onSimulateGpsLoss}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded flex items-center gap-1 text-[11px] transition-colors"
                  title="Toggles NEO-6M satellite lock loss"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Toggle GPS Lock</span>
                </button>

                <button
                  onClick={onSimulateConnection}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 rounded flex items-center gap-1 text-[11px] transition-colors"
                  title="Simulates ESP32 Wi-Fi / MQTT timeout"
                >
                  <WifiOff className="w-3 h-3" />
                  <span>Toggle Disconnect</span>
                </button>

                <button
                  onClick={onSimulateLowBattery}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded flex items-center gap-1 text-[11px] transition-colors"
                  title="Sets battery to 14%"
                >
                  <BatteryCharging className="w-3 h-3" />
                  <span>Low Battery (14%)</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleSendTestFrame}
                disabled={publishing}
                className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 rounded flex items-center gap-1 text-[11px] transition-colors disabled:opacity-50"
                title="Sends a test MQTT frame to the backend subscriber"
              >
                <Send className="w-3 h-3" />
                <span>{publishing ? "Sending..." : "Publish Test MQTT Frame"}</span>
              </button>
            )}

            {/* Inspect MQTT Packet Button (Step 15) */}
            <button
              onClick={() => setShowJson(!showJson)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded flex items-center gap-1 text-[11px] transition-colors ml-auto"
            >
              <Code2 className="w-3 h-3" />
              <span>{showJson ? "Hide MQTT JSON" : "Inspect MQTT Packet"}</span>
            </button>
          </div>

          {/* MQTT JSON Frame Inspector (Step 15) */}
          {showJson && (
            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 font-mono text-[11px] text-sky-300 overflow-x-auto">
              <div className="flex items-center justify-between text-slate-400 mb-1 pb-1 border-b border-slate-800/80">
                <span>Topic: tracker/location (or tracker/#)</span>
                <span
                  className={`text-[10px] font-semibold ${
                    rawMqttPayload
                      ? "text-emerald-400"
                      : mode === "live"
                      ? "text-amber-400"
                      : "text-sky-400"
                  }`}
                >
                  {rawMqttPayload
                    ? "Live MQTT Packet Received"
                    : mode === "live"
                    ? "Awaiting ESP32 Message"
                    : "Simulated Payload"}
                </span>
              </div>
              <pre>{JSON.stringify(displayPayload, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
