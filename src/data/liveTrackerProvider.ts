import {
  TrackerData,
  ActivityLogItem,
  AlertItem,
  LocationBreadcrumb,
  GpsFixStatus,
} from "@/types/tracker";
import { getFirebaseDatabase } from "@/lib/firebase";
import { ref, onValue, set, Unsubscribe } from "firebase/database";

type LiveListener = (payload: {
  tracker: TrackerData;
  activity: ActivityLogItem[];
  alerts: AlertItem[];
  breadcrumbs: LocationBreadcrumb[];
  rawPayload: Record<string, any> | null;
  isConnected: boolean;
}) => void;

class LiveTrackerProvider {
  private isRunning: boolean = false;
  private listeners: Set<LiveListener> = new Set();
  private unsubscribeFirebase: Unsubscribe | null = null;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private lastReceiveTime: number = 0;
  private lastPacketTimestampMs: number = 0;

  private currentData: TrackerData = {
    deviceId: "TRACKER01",
    latitude: null,
    longitude: null,
    altitude: null,
    satellites: 0,
    hdop: 0.0,
    gpsStatus: "searching",
    movement: false,
    acceleration: { x: 0.0, y: 0.0, z: 0.0 },
    batteryPercentage: null,
    batteryVoltage: null,
    wifiRssi: null,
    wifiSsid: null,
    gpsPower: null,
    speed: null,
    heading: null,
    timestamp: new Date().toISOString(),
    deviceStatus: "offline",
    rawMqttPayload: null,
  };

  private activityLogs: ActivityLogItem[] = [];
  private alerts: AlertItem[] = [];
  private breadcrumbs: LocationBreadcrumb[] = [];
  private rawPayload: Record<string, any> | null = null;

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Only execute Firebase Realtime Database listener in browser environment
    if (typeof window === "undefined") return;

    try {
      const db = getFirebaseDatabase();
      const devicePath = "devices/TRACKER01";
      const deviceRef = ref(db, devicePath);

      console.log(`[Firebase RTDB] Attaching onValue() listener to /${devicePath}...`);

      this.unsubscribeFirebase = onValue(
        deviceRef,
        (snapshot) => {
          const raw = snapshot.val();
          console.log("[Firebase RTDB] Live snapshot received from /devices/TRACKER01:", raw);

          if (raw && typeof raw === "object") {
            this.handleFirebaseData(raw);
          } else {
            console.warn("[Firebase RTDB] Empty or missing data at /devices/TRACKER01");
            this.handleEmptyData();
          }
        },
        (error) => {
          console.error("[Firebase RTDB] Error listening to /devices/TRACKER01:", error);
          this.isConnected = false;
          this.currentData.deviceStatus = "offline";
          this.notify();
        }
      );
    } catch (err) {
      console.error("[Firebase RTDB] Failed to initialize Firebase listener:", err);
    }

    // Run connection watchdog to detect offline state when updates cease
    const timeoutMs = this.getTimeoutMs();
    this.watchdogTimer = setInterval(() => {
      this.checkWatchdog(timeoutMs);
    }, 2000);
  }

  public stop() {
    this.isRunning = false;

    if (this.unsubscribeFirebase) {
      try {
        this.unsubscribeFirebase();
      } catch (err) {
        console.warn("[Firebase RTDB] Error while unsubscribing:", err);
      }
      this.unsubscribeFirebase = null;
    }

    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }

    this.isConnected = false;
  }

  public subscribe(listener: LiveListener): () => void {
    this.listeners.add(listener);
    // Push current snapshot immediately
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot() {
    return {
      tracker: { ...this.currentData },
      activity: [...this.activityLogs],
      alerts: [...this.alerts],
      breadcrumbs: [...this.breadcrumbs],
      rawPayload: this.rawPayload,
      isConnected: this.isConnected,
    };
  }

  private notify() {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => {
      try {
        fn(snap);
      } catch (err) {
        console.error("Error in live listener callback:", err);
      }
    });
  }

  private handleFirebaseData(raw: any) {
    this.lastReceiveTime = Date.now();
    this.rawPayload = raw;
    this.isConnected = true;

    // 1. Normalize GPS Status ("SEARCHING" | "VALID" | "LOST" | etc.)
    const rawGps = String(raw.gps_status || raw.gpsStatus || "searching").toLowerCase();
    const gpsStatus: GpsFixStatus =
      rawGps === "valid" ? "valid" : rawGps === "lost" ? "lost" : "searching";

    // 2. Parse Timestamp (handles epoch ms e.g. 1795104982760, or ISO string)
    let packetTimestampMs = Date.now();
    let timestampIso = new Date().toISOString();

    if (typeof raw.timestamp === "number" && raw.timestamp > 0) {
      packetTimestampMs = raw.timestamp;
      timestampIso = new Date(raw.timestamp).toISOString();
    } else if (raw.timestamp) {
      const parsed = new Date(raw.timestamp).getTime();
      if (!isNaN(parsed)) {
        packetTimestampMs = parsed;
        timestampIso = new Date(parsed).toISOString();
      }
    }
    this.lastPacketTimestampMs = packetTimestampMs;

    // 3. Determine Device Connection Status
    const timeoutMs = this.getTimeoutMs();
    const ageMs = Date.now() - packetTimestampMs;
    // Consider device online if packet timestamp is fresh or if an onValue update just arrived
    const isRecentlyActive =
      (Date.now() - this.lastReceiveTime <= timeoutMs) || (ageMs >= 0 && ageMs <= timeoutMs);

    // 4. Safe GPS coordinates & measurements (null when searching / testing indoors)
    const lat = typeof raw.latitude === "number" && !isNaN(raw.latitude) ? raw.latitude : null;
    const lon = typeof raw.longitude === "number" && !isNaN(raw.longitude) ? raw.longitude : null;
    const alt = typeof raw.altitude === "number" && !isNaN(raw.altitude) ? raw.altitude : null;
    const sats = typeof raw.satellites === "number" ? raw.satellites : 0;
    const hdop = typeof raw.hdop === "number" ? raw.hdop : 0;

    // 5. Update central data model
    this.currentData = {
      deviceId: raw.device_id || raw.deviceId || "TRACKER01",
      latitude: lat,
      longitude: lon,
      altitude: alt,
      satellites: sats,
      hdop: hdop,
      gpsStatus,
      movement: Boolean(raw.movement),
      acceleration: {
        x: typeof raw.acceleration?.x === "number" ? raw.acceleration.x : 0,
        y: typeof raw.acceleration?.y === "number" ? raw.acceleration.y : 0,
        z: typeof raw.acceleration?.z === "number" ? raw.acceleration.z : 0,
      },
      batteryPercentage: typeof raw.battery_percentage === "number" ? raw.battery_percentage : null,
      batteryVoltage: typeof raw.battery_voltage === "number" ? raw.battery_voltage : null,
      wifiRssi: typeof raw.wifi_rssi === "number" ? raw.wifi_rssi : null,
      wifiSsid: raw.wifi_ssid || null,
      gpsPower: raw.gps_power ?? null,
      speed: typeof raw.speed === "number" ? raw.speed : null,
      heading: typeof raw.heading === "number" ? raw.heading : null,
      timestamp: timestampIso,
      deviceStatus: isRecentlyActive ? "online" : "offline",
      rawMqttPayload: raw,
    };

    // 6. Record breadcrumb trail if valid coordinates are present
    if (lat !== null && lon !== null) {
      this.breadcrumbs.push({
        lat,
        lng: lon,
        timestamp: timestampIso,
        speed: raw.speed || 0,
      });
      if (this.breadcrumbs.length > 50) {
        this.breadcrumbs.shift();
      }
    }

    this.notify();
  }

  private handleEmptyData() {
    this.isConnected = true;
    this.currentData = {
      ...this.currentData,
      deviceStatus: "offline",
      gpsStatus: "searching",
      latitude: null,
      longitude: null,
    };
    this.notify();
  }

  private checkWatchdog(timeoutMs: number) {
    if (!this.isRunning || !this.isConnected) return;

    const now = Date.now();
    const timeSinceLastReceive = now - this.lastReceiveTime;
    const timeSincePacket = this.lastPacketTimestampMs > 0 ? now - this.lastPacketTimestampMs : Infinity;

    const shouldBeOnline =
      timeSinceLastReceive <= timeoutMs || (timeSincePacket >= 0 && timeSincePacket <= timeoutMs);

    if (!shouldBeOnline && this.currentData.deviceStatus === "online") {
      this.currentData.deviceStatus = "offline";
      this.notify();
    }
  }

  private getTimeoutMs(): number {
    return Number(
      process.env.NEXT_PUBLIC_DEVICE_TIMEOUT_MS || process.env.DEVICE_TIMEOUT_MS || 15000
    );
  }

  // Helper for manual alert/breadcrumbs actions
  public acknowledgeAlert(id: string) {
    this.alerts = this.alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a));
    this.notify();
  }

  public clearAllAlerts() {
    this.alerts = [];
    this.notify();
  }

  public clearBreadcrumbs() {
    this.breadcrumbs = [];
    this.notify();
  }

  public async publishTestFrame(payload: any) {
    if (typeof window === "undefined") return { success: false, error: "SSR" };
    try {
      const db = getFirebaseDatabase();
      const deviceRef = ref(db, "devices/TRACKER01");
      await set(deviceRef, payload);
      return { success: true };
    } catch (err: any) {
      console.error("[Firebase RTDB] Error publishing test frame:", err);
      return { success: false, error: err?.message };
    }
  }
}

export const liveTrackerProvider = new LiveTrackerProvider();
