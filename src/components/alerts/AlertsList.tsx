"use client";

import React from "react";
import { AlertItem } from "@/types/tracker";
import {
  Bell,
  AlertTriangle,
  Radio,
  BatteryWarning,
  Activity,
  MapPin,
  Check,
  Trash2,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface AlertsListProps {
  alerts: AlertItem[];
  onAcknowledge: (id: string) => void;
  onClearAll: () => void;
}

export default function AlertsList({
  alerts,
  onAcknowledge,
  onClearAll,
}: AlertsListProps) {
  const getAlertIcon = (type: AlertItem["type"]) => {
    switch (type) {
      case "movement":
        return Activity;
      case "gps_lost":
        return AlertTriangle;
      case "device_offline":
        return Radio;
      case "low_battery":
        return BatteryWarning;
      case "geofence":
        return MapPin;
      default:
        return Bell;
    }
  };

  const getSeverityStyle = (severity: AlertItem["severity"]) => {
    switch (severity) {
      case "critical":
        return {
          bg: "bg-rose-500/10 dark:bg-rose-950/30",
          border: "border-rose-500/30",
          text: "text-rose-600 dark:text-rose-400",
          iconColor: "text-rose-500",
        };
      case "warning":
        return {
          bg: "bg-amber-500/10 dark:bg-amber-950/30",
          border: "border-amber-500/30",
          text: "text-amber-600 dark:text-amber-400",
          iconColor: "text-amber-500",
        };
      case "info":
      default:
        return {
          bg: "bg-sky-500/10 dark:bg-sky-950/30",
          border: "border-sky-500/30",
          text: "text-sky-600 dark:text-sky-400",
          iconColor: "text-sky-500",
        };
    }
  };

  const unreadCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
            System Alerts & Thresholds
          </h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-full bg-rose-500 text-white">
              {unreadCount} Active
            </span>
          )}
        </div>

        {alerts.length > 0 && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-rose-500 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs font-mono">
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-500">
            <Check className="w-4 h-4" />
          </div>
          No active alerts. All systems operational.
        </div>
      ) : (
        <div className="space-y-2.5">
          {alerts.map((alert) => {
            const Icon = getAlertIcon(alert.type);
            const style = getSeverityStyle(alert.severity);

            return (
              <div
                key={alert.id}
                className={`p-3.5 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                  style.bg
                } ${style.border} ${alert.acknowledged ? "opacity-60" : "opacity-100"}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-1 rounded ${style.bg}`}>
                    <Icon className={`w-4 h-4 ${style.iconColor}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold font-mono ${style.text}`}>
                        {alert.title}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {alert.severity}
                      </span>
                      {alert.acknowledged && (
                        <span className="text-[10px] font-mono text-slate-400">
                          (Acknowledged)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {alert.message}
                    </p>
                    <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                      {timeAgo(alert.timestamp)} &bull; {new Date(alert.timestamp).toLocaleTimeString([], { hour12: false })}
                    </span>
                  </div>
                </div>

                {!alert.acknowledged && (
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    title="Acknowledge alert"
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors shrink-0"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
