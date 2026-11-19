"use client";

import React, { useState } from "react";
import { ActivityLogItem } from "@/types/tracker";
import { History, Download, Filter, MapPin, Radio, Activity, Zap } from "lucide-react";

interface ActivityHistoryProps {
  logs: ActivityLogItem[];
}

export default function ActivityHistory({ logs }: ActivityHistoryProps) {
  const [filterType, setFilterType] = useState<string>("all");

  const filteredLogs = logs.filter((log) => {
    if (filterType === "all") return true;
    return log.type === filterType;
  });

  const handleExportCSV = () => {
    const headers = ["Timestamp", "Time", "Event", "Location", "Type", "Details"];
    const rows = logs.map((l) => [
      l.timestamp,
      l.timeFormatted,
      `"${l.event}"`,
      `"${l.location}"`,
      l.type,
      `"${l.details || ""}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tracker_activity_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getEventBadge = (type: ActivityLogItem["type"]) => {
    switch (type) {
      case "movement":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "gps":
        return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
      case "power":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
      case "alert":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-sky-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
            Activity & Event Log
          </h3>
          <span className="text-xs font-mono text-slate-400 ml-1">
            ({filteredLogs.length} events)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-md border border-slate-200 dark:border-slate-700/80 text-[11px] font-mono">
            {["all", "movement", "gps", "alert"].map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-2 py-0.5 rounded capitalize transition-colors ${
                  filterType === f
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            title="Export CSV"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
          >
            <Download className="w-3 h-3" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-800/20">
              <th className="py-2.5 px-3 font-semibold">Time</th>
              <th className="py-2.5 px-3 font-semibold">Event</th>
              <th className="py-2.5 px-3 font-semibold">Location</th>
              <th className="py-2.5 px-3 font-semibold hidden md:table-cell">Telemetry Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  No activity matching selected filter.
                </td>
              </tr>
            ) : (
              filteredLogs.slice(0, 15).map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium">
                    {log.timeFormatted}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getEventBadge(
                        log.type
                      )}`}
                    >
                      {log.event}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap font-semibold">
                    {log.location}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 hidden md:table-cell text-[11px] max-w-xs truncate">
                    {log.details || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {logs.length > 15 && (
        <div className="mt-3 text-center text-[11px] font-mono text-slate-400">
          Showing latest 15 of {logs.length} logged events
        </div>
      )}
    </div>
  );
}
