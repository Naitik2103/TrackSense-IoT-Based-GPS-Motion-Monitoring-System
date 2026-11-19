import {
  TrackerData,
  ActivityLogItem,
  AlertItem,
  LocationBreadcrumb,
} from "@/types/tracker";

type DemoListener = (payload: {
  tracker: TrackerData;
  activity: ActivityLogItem[];
  alerts: AlertItem[];
  breadcrumbs: LocationBreadcrumb[];
  rawPayload: Record<string, any>;
}) => void;

class DemoTrackerProvider {
  private isRunning: boolean = false;
  private timer: NodeJS.Timeout | null = null;
  private listeners: Set<DemoListener> = new Set();
  private waypointIndex: number = 0;

  private currentData: TrackerData = {
    deviceId: "TRACKER01",
    latitude: 23.1905,
    longitude: 72.628,
    altitude: 54.2,
    satellites: 8,
    hdop: 1.2,
    gpsStatus: "valid",
    movement: false,
    acceleration: { x: 0.01, y: 0.0, z: 9.66 },
    batteryPercentage: 86,
    batteryVoltage: 4.09,
    wifiRssi: -64,
    wifiSsid: "Campus_IoT_WLAN",
    gpsPower: true,
    speed: 0.0,
    heading: 42,
    timestamp: new Date().toISOString(),
    deviceStatus: "online",
  };

  private activityLogs: ActivityLogItem[] = [
    {
      id: "demo-act-1",
      timestamp: new Date(Date.now() - 300000).toISOString(),
      timeFormatted: new Date(Date.now() - 300000).toLocaleTimeString([], { hour12: false }),
      event: "Device online",
      location: "23.190200, 72.627800",
      type: "system",
      details: "ESP32 Wi-Fi connected to Campus_IoT_WLAN. MQTT connection established.",
    },
    {
      id: "demo-act-2",
      timestamp: new Date(Date.now() - 200000).toISOString(),
      timeFormatted: new Date(Date.now() - 200000).toLocaleTimeString([], { hour12: false }),
      event: "GPS location updated",
      location: "23.190350, 72.627910",
      type: "gps",
      details: "NEO-6M 3D fix locked (8 satellites, HDOP 1.2).",
    },
    {
      id: "demo-act-3",
      timestamp: new Date(Date.now() - 60000).toISOString(),
      timeFormatted: new Date(Date.now() - 60000).toLocaleTimeString([], { hour12: false }),
      event: "Movement detected",
      location: "23.190500, 72.628000",
      type: "movement",
      details: "MPU6050 accelerometer wake-on-motion triggered.",
    },
  ];

  private alerts: AlertItem[] = [
    {
      id: "demo-al-1",
      type: "movement",
      severity: "info",
      title: "Movement Detected",
      message: "Asset movement detected by MPU6050 accelerometer.",
      timestamp: new Date(Date.now() - 60000).toISOString(),
      acknowledged: false,
    },
  ];

  private breadcrumbs: LocationBreadcrumb[] = [
    { lat: 23.1902, lng: 72.6278, timestamp: new Date(Date.now() - 300000).toISOString(), speed: 0 },
    { lat: 23.19035, lng: 72.62791, timestamp: new Date(Date.now() - 200000).toISOString(), speed: 2.5 },
    { lat: 23.1905, lng: 72.628, timestamp: new Date(Date.now() - 60000).toISOString(), speed: 3.8 },
  ];

  private waypoints: [number, number, boolean, number][] = [
    [23.1905, 72.628, true, 3.2],
    [23.19053, 72.62804, true, 3.8],
    [23.19058, 72.62809, true, 4.1],
    [23.19064, 72.62816, true, 4.5],
    [23.19072, 72.62825, true, 4.2],
    [23.19079, 72.62836, true, 3.6],
    [23.19085, 72.62848, false, 0.4],
    [23.19086, 72.6285, false, 0.0],
    [23.19082, 72.62862, true, 2.9],
    [23.19075, 72.62873, true, 3.5],
    [23.19065, 72.62881, true, 3.9],
    [23.19052, 72.62886, true, 4.0],
    [23.1904, 72.62884, true, 3.7],
    [23.1903, 72.62875, true, 3.3],
    [23.19022, 72.6286, true, 3.1],
    [23.1902, 72.6284, true, 3.4],
    [23.19028, 72.6282, true, 3.6],
    [23.19038, 72.62808, true, 3.5],
  ];

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.timer = setInterval(() => {
      this.tick();
    }, 3500);
  }

  public stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public subscribe(listener: DemoListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot() {
    const rawPayload = {
      device_id: this.currentData.deviceId,
      latitude: this.currentData.latitude,
      longitude: this.currentData.longitude,
      altitude: this.currentData.altitude,
      satellites: this.currentData.satellites,
      hdop: this.currentData.hdop,
      gps_status: this.currentData.gpsStatus,
      movement: this.currentData.movement,
      acceleration: this.currentData.acceleration,
      battery_percentage: this.currentData.batteryPercentage,
      battery_voltage: this.currentData.batteryVoltage,
      wifi_rssi: this.currentData.wifiRssi,
      gps_power: this.currentData.gpsPower,
      timestamp: this.currentData.timestamp,
    };

    return {
      tracker: { ...this.currentData, rawMqttPayload: rawPayload },
      activity: [...this.activityLogs],
      alerts: [...this.alerts],
      breadcrumbs: [...this.breadcrumbs],
      rawPayload,
    };
  }

  private notify() {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snap));
  }

  private tick() {
    this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
    const [targetLat, targetLng, moving, speed] = this.waypoints[this.waypointIndex];

    const jitterLat = (Math.random() - 0.5) * 0.000008;
    const jitterLng = (Math.random() - 0.5) * 0.000008;
    const lat = +(targetLat + jitterLat).toFixed(6);
    const lon = +(targetLng + jitterLng).toFixed(6);

    const accelX = moving ? +(0.15 + (Math.random() * 0.2 - 0.1)).toFixed(2) : +(Math.random() * 0.02 - 0.01).toFixed(2);
    const accelY = moving ? +(-0.1 + (Math.random() * 0.2 - 0.1)).toFixed(2) : +(Math.random() * 0.02 - 0.01).toFixed(2);
    const accelZ = +(9.66 + (Math.random() * 0.1 - 0.05)).toFixed(2);

    const prevMoving = this.currentData.movement;

    this.currentData = {
      ...this.currentData,
      latitude: lat,
      longitude: lon,
      movement: moving,
      speed,
      acceleration: { x: accelX, y: accelY, z: accelZ },
      timestamp: new Date().toISOString(),
      deviceStatus: "online",
      gpsPower: moving ? true : false,
      heading: (this.currentData.heading! + (moving ? 15 : 0)) % 360,
    };

    // Add breadcrumb
    this.breadcrumbs = [
      ...this.breadcrumbs.slice(-99),
      { lat, lng: lon, timestamp: new Date().toISOString(), speed },
    ];

    if (moving && !prevMoving) {
      this.addAlert("movement", "info", "Movement Detected", "MPU6050 wake-on-motion threshold triggered.");
      this.addActivity("Movement detected", `${lat.toFixed(4)}, ${lon.toFixed(4)}`, "movement", "Asset displacement registered.");
    }

    if (this.waypointIndex % 4 === 0) {
      this.addActivity(
        "GPS location updated",
        `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        "gps",
        `Speed: ${speed.toFixed(1)} km/h. Sats: ${this.currentData.satellites}`
      );
    }

    this.notify();
  }

  // Demo test actions
  public simulateMotionBurst() {
    this.currentData.movement = true;
    this.currentData.acceleration = {
      x: +(Math.random() * 0.8 + 0.3).toFixed(2),
      y: -(Math.random() * 0.6 + 0.2).toFixed(2),
      z: +(9.66 + (Math.random() * 0.5 - 0.25)).toFixed(2),
    };
    this.addAlert("movement", "info", "Movement Detected", "MPU6050 high acceleration spike registered.");
    this.addActivity(
      "Movement detected",
      this.currentData.latitude ? `${this.currentData.latitude.toFixed(4)}, ${this.currentData.longitude?.toFixed(4)}` : "Active",
      "movement",
      "Motion interrupt triggered."
    );
    this.notify();
  }

  public simulateGpsLoss() {
    const isCurrentlyLost = this.currentData.gpsStatus === "lost";
    this.currentData.gpsStatus = isCurrentlyLost ? "valid" : "lost";
    this.currentData.satellites = isCurrentlyLost ? 8 : 0;
    this.currentData.hdop = isCurrentlyLost ? 1.2 : 99.9;

    if (!isCurrentlyLost) {
      this.addAlert("gps_lost", "warning", "GPS Signal Lost", "NEO-6M satellite lock lost. Carrier frequency search active.");
      this.addActivity("GPS signal lost", "Signal Lost", "alert", "NEO-6M lost lock. Satellites = 0.");
    } else {
      this.addActivity(
        "GPS location updated",
        this.currentData.latitude ? `${this.currentData.latitude.toFixed(4)}, ${this.currentData.longitude?.toFixed(4)}` : "Fix",
        "gps",
        "3D fix re-acquired with 8 satellites."
      );
    }
    this.notify();
  }

  public simulateToggleConnection() {
    if (this.currentData.deviceStatus === "online") {
      this.currentData.deviceStatus = "offline";
      this.addAlert("device_offline", "critical", "Device Offline", "No telemetry heartbeat received within timeout.");
      this.addActivity("Device offline", "Disconnected", "alert", "Watchdog triggered offline state.");
    } else {
      this.currentData.deviceStatus = "online";
      this.currentData.timestamp = new Date().toISOString();
      this.addActivity("Device connected", "Online", "system", "ESP32 Wi-Fi and MQTT re-established.");
    }
    this.notify();
  }

  public simulateLowBattery() {
    this.currentData.batteryPercentage = 14;
    this.currentData.batteryVoltage = 3.42;
    this.addAlert("low_battery", "critical", "Low Battery Warning", "Battery capacity at 14% (3.42V).");
    this.addActivity("Low Battery Warning", "Power Warning", "power", "Battery capacity dropped below 15%.");
    this.notify();
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

  private addActivity(event: string, location: string, type: ActivityLogItem["type"], details?: string) {
    const item: ActivityLogItem = {
      id: "demo-act-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString([], { hour12: false }),
      event,
      location,
      type,
      details,
    };
    this.activityLogs = [item, ...this.activityLogs.slice(0, 49)];
  }

  private addAlert(type: AlertItem["type"], severity: AlertItem["severity"], title: string, message: string) {
    const existing = this.alerts.find((a) => a.type === type && !a.acknowledged);
    if (existing) return;
    const alert: AlertItem = {
      id: "demo-al-" + Date.now(),
      type,
      severity,
      title,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };
    this.alerts = [alert, ...this.alerts.slice(0, 19)];
  }
}

export const demoTrackerProvider = new DemoTrackerProvider();
