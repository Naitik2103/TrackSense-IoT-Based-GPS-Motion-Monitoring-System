"use client";

import React from "react";
import {
  LayoutDashboard,
  MapPin,
  Cpu,
  History,
  Bell,
  Settings,
  BatteryCharging,
  Radio,
  X,
  Zap,
} from "lucide-react";
import { TrackerData } from "@/types/tracker";

export type NavTab = "dashboard" | "map" | "status" | "activity" | "alerts" | "settings";

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  data: TrackerData;
  unreadAlertsCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenSettingsModal: () => void;
}

export default function Sidebar({
  currentTab,
  onSelectTab,
  data,
  unreadAlertsCount,
  mobileOpen,
  onCloseMobile,
  onOpenSettingsModal,
}: SidebarProps) {
  const navItems = [
    { id: "dashboard" as NavTab, label: "Dashboard", icon: LayoutDashboard },
    { id: "map" as NavTab, label: "Live Location", icon: MapPin },
    { id: "status" as NavTab, label: "Device Status", icon: Cpu },
    { id: "activity" as NavTab, label: "Activity", icon: History },
    {
      id: "alerts" as NavTab,
      label: "Alerts",
      icon: Bell,
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : undefined,
    },
    { id: "settings" as NavTab, label: "Settings", icon: Settings },
  ];

  const handleNavClick = (id: NavTab) => {
    if (id === "settings") {
      onOpenSettingsModal();
    } else {
      onSelectTab(id);
    }
    onCloseMobile();
  };

  const isOnline = data.deviceStatus === "online";
  const hasValidFix = data.gpsStatus === "valid" && data.satellites >= 4;

  const mosfetLabel =
    data.gpsPower === true
      ? "GPS Power ON"
      : data.gpsPower === false
      ? "GPS Power OFF"
      : "ACTIVE";

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 md:top-[57px] left-0 z-40 md:z-20 w-64 h-full md:h-[calc(100vh-57px)] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Top: Nav items */}
        <div className="p-4 space-y-6">
          {/* Mobile Header Close */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 md:hidden">
            <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
              Navigation
            </span>
            <button
              onClick={onCloseMobile}
              className="p-1 rounded text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1">
            <div className="px-3 text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono font-medium transition-colors ${
                    isActive
                      ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold border border-sky-200 dark:border-sky-800/80"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? "text-sky-600 dark:text-sky-400" : "text-slate-400"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white font-mono">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Subsystem Status list (Step 18) */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="px-3 text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Subsystems
            </div>
            <div className="px-3 py-1 space-y-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>ESP32 Wi-Fi</span>
                <span
                  className={
                    data.wifiRssi !== null ? "text-emerald-500 font-semibold" : "text-slate-400"
                  }
                >
                  {data.wifiRssi !== null ? `${data.wifiRssi} dBm` : isOnline ? "Connected" : "Offline"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>NEO-6M GPS</span>
                <span
                  className={
                    hasValidFix ? "text-emerald-500 font-semibold" : "text-amber-500"
                  }
                >
                  {hasValidFix ? "3D Lock" : "Searching"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>MPU6050 Motion</span>
                <span
                  className={
                    data.movement ? "text-emerald-500 font-semibold" : "text-slate-400"
                  }
                >
                  {data.movement ? "Motion" : "Idle"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>MOSFET Gate</span>
                <span className="text-sky-400">{mosfetLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: TRACKER-01 Status (As requested in Section 3 & 16) */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-sky-500" />
                <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                  {data.deviceId}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnline
                      ? "bg-emerald-500"
                      : data.deviceStatus === "connecting"
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                />
                <span
                  className={`text-[11px] font-mono font-semibold capitalize ${
                    isOnline
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

            {/* Battery status bar (Step 16) */}
            <div className="space-y-1 mt-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <BatteryCharging className="w-3 h-3 text-emerald-500" />
                  Battery
                </span>
                <span>
                  {data.batteryPercentage !== null
                    ? `${data.batteryPercentage}%`
                    : "N/A"}{" "}
                  {data.batteryVoltage !== null ? `(${data.batteryVoltage.toFixed(2)}V)` : ""}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    data.batteryPercentage === null
                      ? "bg-slate-500"
                      : data.batteryPercentage < 20
                      ? "bg-rose-500"
                      : data.batteryPercentage < 40
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${data.batteryPercentage ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
