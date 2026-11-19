"use client";

import { useEffect, useState, useCallback } from "react";
import {
  TrackerData,
  ActivityLogItem,
  AlertItem,
  LocationBreadcrumb,
  DashboardMode,
} from "@/types/tracker";
import { demoTrackerProvider } from "@/data/demoTrackerProvider";
import { liveTrackerProvider } from "@/data/liveTrackerProvider";
import { timeAgo } from "@/lib/utils";

export function useTrackerData() {
  const [mode, setModeState] = useState<DashboardMode>("live");
  const [trackerData, setTrackerData] = useState<TrackerData>(liveTrackerProvider.getSnapshot().tracker);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(liveTrackerProvider.getSnapshot().activity);
  const [alerts, setAlerts] = useState<AlertItem[]>(liveTrackerProvider.getSnapshot().alerts);
  const [breadcrumbs, setBreadcrumbs] = useState<LocationBreadcrumb[]>(liveTrackerProvider.getSnapshot().breadcrumbs);
  const [rawMqttPayload, setRawMqttPayload] = useState<Record<string, any> | null>(liveTrackerProvider.getSnapshot().rawPayload);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [lastUpdatedText, setLastUpdatedText] = useState<string>("just now");

  // Keep last updated time relative text fresh every second
  useEffect(() => {
    const updateRelativeTime = () => {
      if (!trackerData.timestamp) {
        setLastUpdatedText("never");
        return;
      }
      setLastUpdatedText(timeAgo(trackerData.timestamp));
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 1000);
    return () => clearInterval(interval);
  }, [trackerData.timestamp]);

  // Handle Mode switching between LIVE and DEMO
  useEffect(() => {
    if (mode === "demo") {
      liveTrackerProvider.stop();
      demoTrackerProvider.start();

      const unsub = demoTrackerProvider.subscribe((snap) => {
        setTrackerData(snap.tracker);
        setActivityLogs(snap.activity);
        setAlerts(snap.alerts);
        setBreadcrumbs(snap.breadcrumbs);
        setRawMqttPayload(snap.rawPayload);
        setIsLiveConnected(true);
      });

      return () => {
        unsub();
        demoTrackerProvider.stop();
      };
    } else {
      demoTrackerProvider.stop();
      liveTrackerProvider.start();

      const unsub = liveTrackerProvider.subscribe((snap) => {
        setTrackerData(snap.tracker);
        setActivityLogs(snap.activity);
        setAlerts(snap.alerts);
        setBreadcrumbs(snap.breadcrumbs);
        setRawMqttPayload(snap.rawPayload);
        setIsLiveConnected(snap.isConnected);
      });

      return () => {
        unsub();
        liveTrackerProvider.stop();
      };
    }
  }, [mode]);

  const setMode = useCallback((newMode: DashboardMode) => {
    setModeState(newMode);
  }, []);

  const acknowledgeAlert = useCallback(
    (id: string) => {
      if (mode === "demo") {
        demoTrackerProvider.acknowledgeAlert(id);
      } else {
        liveTrackerProvider.acknowledgeAlert(id);
      }
    },
    [mode]
  );

  const clearAlerts = useCallback(() => {
    if (mode === "demo") {
      demoTrackerProvider.clearAllAlerts();
    } else {
      liveTrackerProvider.clearAllAlerts();
    }
  }, [mode]);

  const clearBreadcrumbs = useCallback(() => {
    if (mode === "demo") {
      demoTrackerProvider.clearBreadcrumbs();
    } else {
      liveTrackerProvider.clearBreadcrumbs();
    }
  }, [mode]);

  // Demo fault actions
  const simulateMotionBurst = useCallback(() => {
    if (mode === "demo") demoTrackerProvider.simulateMotionBurst();
  }, [mode]);

  const simulateGpsLoss = useCallback(() => {
    if (mode === "demo") demoTrackerProvider.simulateGpsLoss();
  }, [mode]);

  const simulateToggleConnection = useCallback(() => {
    if (mode === "demo") demoTrackerProvider.simulateToggleConnection();
  }, [mode]);

  const simulateLowBattery = useCallback(() => {
    if (mode === "demo") demoTrackerProvider.simulateLowBattery();
  }, [mode]);

  // Publish test packet directly to backend MQTT pipeline
  const publishTestFrame = useCallback(
    async (customPayload?: any) => {
      const payload = customPayload || {
        device_id: "TRACKER01",
        latitude: 23.1906,
        longitude: 72.6281,
        altitude: 54.5,
        satellites: 8,
        hdop: 1.15,
        gps_status: "valid",
        movement: true,
        acceleration: { x: 0.14, y: -0.06, z: 9.72 },
        battery_percentage: 84,
        battery_voltage: 4.02,
        wifi_rssi: -62,
        gps_power: true,
        timestamp: new Date().toISOString(),
      };
      return liveTrackerProvider.publishTestFrame(payload);
    },
    []
  );

  return {
    mode,
    setMode,
    trackerData,
    activityLogs,
    alerts,
    breadcrumbs,
    rawMqttPayload,
    isLiveConnected,
    lastUpdatedText,
    acknowledgeAlert,
    clearAlerts,
    clearBreadcrumbs,
    simulateMotionBurst,
    simulateGpsLoss,
    simulateToggleConnection,
    simulateLowBattery,
    publishTestFrame,
  };
}
