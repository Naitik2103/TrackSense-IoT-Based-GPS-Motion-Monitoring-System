import {
  TrackerData,
  MqttTelemetryPayload,
  ActivityLogItem,
  AlertItem,
  LocationBreadcrumb,
} from "@/types/tracker";

type StoreListener = (data: {
  tracker: TrackerData;
  activity: ActivityLogItem[];
  alerts: AlertItem[];
  breadcrumbs: LocationBreadcrumb[];
  rawPayload: Record<string, any> | null;
}) => void;

class BackendStore {
  private trackerData: TrackerData;
  private activityLogs: ActivityLogItem[] = [];
  private alerts: AlertItem[] = [];
  private breadcrumbs: LocationBreadcrumb[] = [];
  private rawMqttPayload: Record<string, any> | null = null;
  private listeners: Set<StoreListener> = new Set();

  private lastReceivedTimestamp: number = 0;
  private deviceTimeoutMs: number = 15000; // 15 seconds configurable timeout
  private watchdogTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Configurable timeout from environment or default
    const envTimeout = process.env.DEVICE_TIMEOUT_MS ? parseInt(process.env.DEVICE_TIMEOUT_MS, 10) : 15000;
    this.deviceTimeoutMs = isNaN(envTimeout) ? 15000 : envTimeout;

    // Initial Live Tracker State (starts in awaiting/offline state until first packet)
    this.trackerData = {
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
      speed: 0.0,
      heading: 0,
      timestamp: new Date().toISOString(),
      deviceStatus: "offline",
      rawMqttPayload: null,
    };

    this.startWatchdog();
  }

  public getTrackerData(): TrackerData {
    return { ...this.trackerData, rawMqttPayload: this.rawMqttPayload };
  }

  public getActivityLogs(): ActivityLogItem[] {
    return [...this.activityLogs];
  }

  public getAlerts(): AlertItem[] {
    return [...this.alerts];
  }

  public getBreadcrumbs(): LocationBreadcrumb[] {
    return [...this.breadcrumbs];
  }

  public getRawPayload(): Record<string, any> | null {
    return this.rawMqttPayload;
  }

  public getTimeoutMs(): number {
    return this.deviceTimeoutMs;
  }

  public setTimeoutMs(ms: number) {
    this.deviceTimeoutMs = ms;
  }

  public subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    // Send immediate snapshot
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot() {
    return {
      tracker: this.getTrackerData(),
      activity: this.getActivityLogs(),
      alerts: this.getAlerts(),
      breadcrumbs: this.getBreadcrumbs(),
      rawPayload: this.getRawPayload(),
    };
  }

  private notify() {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => {
      try {
        fn(snap);
      } catch (err) {
        console.error("Error in backend store listener:", err);
      }
    });
  }

  /**
   * Safe parser & ingestion of incoming MQTT / REST telemetry payload (Step 2 & 3)
   */
  public ingestMqttPayload(rawPayload: any, topic?: string): TrackerData {
    if (!rawPayload || typeof rawPayload !== "object") {
      throw new Error("Invalid payload: expected JSON object");
    }

    this.rawMqttPayload = rawPayload;
    this.lastReceivedTimestamp = Date.now();

    const prevStatus = this.trackerData.deviceStatus;
    const prevMovement = this.trackerData.movement;
    const prevGpsStatus = this.trackerData.gpsStatus;

    // 1. Device ID
    const deviceId =
      String(rawPayload.device_id || rawPayload.deviceId || this.trackerData.deviceId || "TRACKER01").trim();

    // 2. Coordinates validation
    let lat: number | null = null;
    let lon: number | null = null;
    if (typeof rawPayload.latitude === "number" && !isNaN(rawPayload.latitude) && rawPayload.latitude >= -90 && rawPayload.latitude <= 90) {
      lat = Number(rawPayload.latitude.toFixed(6));
    }
    if (typeof rawPayload.longitude === "number" && !isNaN(rawPayload.longitude) && rawPayload.longitude >= -180 && rawPayload.longitude <= 180) {
      lon = Number(rawPayload.longitude.toFixed(6));
    }

    const altitude = typeof rawPayload.altitude === "number" ? Number(rawPayload.altitude.toFixed(1)) : this.trackerData.altitude;
    const satellites = typeof rawPayload.satellites === "number" ? Math.max(0, Math.floor(rawPayload.satellites)) : 0;
    const hdop = typeof rawPayload.hdop === "number" ? Number(rawPayload.hdop.toFixed(2)) : 0.0;

    // 3. GPS Fix Status
    let gpsStatus: TrackerData["gpsStatus"] = "searching";
    const rawGpsStatus = String(rawPayload.gps_status || rawPayload.gpsStatus || "").toLowerCase();
    if (rawGpsStatus === "valid" || rawGpsStatus === "3d" || rawGpsStatus === "2d") {
      gpsStatus = "valid";
    } else if (rawGpsStatus === "lost" || (satellites === 0 && this.lastReceivedTimestamp > 0)) {
      gpsStatus = "lost";
    } else if (satellites >= 4 && lat !== null && lon !== null) {
      gpsStatus = "valid";
    } else {
      gpsStatus = "searching";
    }

    // 4. Movement (Step 11: Trust movement sent by ESP32)
    const movement = typeof rawPayload.movement === "boolean" ? rawPayload.movement : false;

    // 5. Acceleration
    const rawAccel = rawPayload.acceleration || {};
    const acceleration = {
      x: typeof rawAccel.x === "number" ? Number(rawAccel.x.toFixed(2)) : 0.0,
      y: typeof rawAccel.y === "number" ? Number(rawAccel.y.toFixed(2)) : 0.0,
      z: typeof rawAccel.z === "number" ? Number(rawAccel.z.toFixed(2)) : 9.8,
    };

    // 6. Battery (Step 16)
    const rawBattPct = rawPayload.battery_percentage ?? rawPayload.batteryPercentage ?? rawPayload.battery;
    const batteryPercentage = typeof rawBattPct === "number" ? Math.min(100, Math.max(0, Math.round(rawBattPct))) : null;

    const rawBattV = rawPayload.battery_voltage ?? rawPayload.batteryVoltage;
    const batteryVoltage = typeof rawBattV === "number" ? Number(rawBattV.toFixed(2)) : null;

    // 7. Wi-Fi RSSI (Step 18)
    const rawRssi = rawPayload.wifi_rssi ?? rawPayload.wifiRssi;
    const wifiRssi = typeof rawRssi === "number" ? Math.round(rawRssi) : null;

    // 8. MOSFET GPS Power Gating (Step 17)
    const rawGpsPower = rawPayload.gps_power ?? rawPayload.gpsPower;
    const gpsPower = typeof rawGpsPower === "boolean" ? rawGpsPower : null;

    // 9. Speed & Heading
    const speed = typeof rawPayload.speed === "number" ? Number(rawPayload.speed.toFixed(1)) : null;
    const heading = typeof rawPayload.heading === "number" ? Math.round(rawPayload.heading) : null;

    // 10. Timestamp
    const timestamp = rawPayload.timestamp || new Date().toISOString();

    // Device is actively ONLINE
    const deviceStatus: TrackerData["deviceStatus"] = "online";

    // Update state
    this.trackerData = {
      deviceId,
      latitude: lat,
      longitude: lon,
      altitude,
      satellites,
      hdop,
      gpsStatus,
      movement,
      acceleration,
      batteryPercentage,
      batteryVoltage,
      wifiRssi,
      wifiSsid: rawPayload.wifi_ssid || this.trackerData.wifiSsid,
      gpsPower,
      speed,
      heading,
      timestamp,
      deviceStatus,
      rawMqttPayload: this.rawMqttPayload,
    };

    // Update Breadcrumb trail if valid coordinates
    if (lat !== null && lon !== null) {
      this.addBreadcrumb(lat, lon, speed);
    }

    // Dynamic Activity & Alert tracking
    // Event: Device came online
    if (prevStatus !== "online") {
      this.addActivity(
        "Device connected",
        lat !== null && lon !== null ? `${lat.toFixed(4)}, ${lon.toFixed(4)}` : "Online",
        "system",
        `MQTT packet received from ${deviceId}. Wi-Fi RSSI: ${wifiRssi ? `${wifiRssi} dBm` : "OK"}.`
      );
      this.removeAlertByType("device_offline");
    }

    // Event: Movement state transition
    if (movement && !prevMovement) {
      this.addActivity(
        "Movement detected",
        lat !== null && lon !== null ? `${lat.toFixed(4)}, ${lon.toFixed(4)}` : "Active",
        "movement",
        `MPU6050 interrupt triggered. Acceleration: (${acceleration.x}, ${acceleration.y}, ${acceleration.z}) m/s²`
      );
      this.addAlert("movement", "info", "Movement Detected", "MPU6050 detected asset displacement.");
    }

    // Event: GPS Fix transition
    if (gpsStatus === "valid" && prevGpsStatus !== "valid" && lat !== null && lon !== null) {
      this.addActivity(
        "GPS location updated",
        `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        "gps",
        `NEO-6M acquired 3D lock with ${satellites} satellites (HDOP ${hdop}).`
      );
      this.removeAlertByType("gps_lost");
    } else if (gpsStatus === "lost" && prevGpsStatus === "valid") {
      this.addAlert("gps_lost", "warning", "GPS Signal Lost", "NEO-6M satellite lock lost. Awaiting signal recovery.");
      this.addActivity("GPS signal lost", "Signal Lost", "alert", "NEO-6M lost carrier lock.");
    }

    // Event: Low battery check
    if (batteryPercentage !== null && batteryPercentage <= 15) {
      this.addAlert(
        "low_battery",
        "critical",
        "Low Battery Warning",
        `Battery level at ${batteryPercentage}% (${batteryVoltage ? `${batteryVoltage}V` : "Low"}).`
      );
    }

    this.notify();
    return this.trackerData;
  }

  public addActivity(event: string, location: string, type: ActivityLogItem["type"], details?: string) {
    const item: ActivityLogItem = {
      id: "act-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString([], { hour12: false }),
      event,
      location,
      type,
      details,
    };
    // Step 12: Keep latest 50 events max to prevent memory growth
    this.activityLogs = [item, ...this.activityLogs.slice(0, 49)];
  }

  public addAlert(type: AlertItem["type"], severity: AlertItem["severity"], title: string, message: string) {
    // Avoid duplicate unresolved alerts of same type
    const existing = this.alerts.find((a) => a.type === type && !a.acknowledged);
    if (existing) return;

    const alert: AlertItem = {
      id: "al-" + Date.now(),
      type,
      severity,
      title,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };
    this.alerts = [alert, ...this.alerts.slice(0, 19)];
  }

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

  private removeAlertByType(type: AlertItem["type"]) {
    this.alerts = this.alerts.filter((a) => a.type !== type);
  }

  private addBreadcrumb(lat: number, lng: number, speed?: number | null) {
    const last = this.breadcrumbs[this.breadcrumbs.length - 1];
    if (last && Math.abs(last.lat - lat) < 0.000005 && Math.abs(last.lng - lng) < 0.000005) {
      return;
    }
    this.breadcrumbs = [
      ...this.breadcrumbs.slice(-99),
      {
        lat,
        lng,
        timestamp: new Date().toISOString(),
        speed,
      },
    ];
  }

  /**
   * Watchdog timer to transition device to Offline if no message received within DEVICE_TIMEOUT_MS (Step 5)
   */
  private startWatchdog() {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);

    this.watchdogTimer = setInterval(() => {
      if (this.lastReceivedTimestamp > 0 && this.trackerData.deviceStatus === "online") {
        const elapsed = Date.now() - this.lastReceivedTimestamp;
        if (elapsed > this.deviceTimeoutMs) {
          this.trackerData.deviceStatus = "offline";
          this.addAlert(
            "device_offline",
            "critical",
            "Device Offline",
            `No telemetry received from ${this.trackerData.deviceId} for > ${Math.round(this.deviceTimeoutMs / 1000)}s.`
          );
          this.addActivity("Device offline", "Disconnected", "alert", "Telemetry heartbeat timeout reached.");
          this.notify();
        }
      }
    }, 2000);
  }
}

// Global singleton pattern for Next.js to prevent multi-instance recreation in dev/runtime
const globalForStore = globalThis as unknown as { __trackerBackendStore?: BackendStore };
export const backendStore = globalForStore.__trackerBackendStore || new BackendStore();
if (process.env.NODE_ENV !== "production") {
  globalForStore.__trackerBackendStore = backendStore;
}
