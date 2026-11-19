import {
  TrackerData,
  MqttPayload,
  ActivityLogItem,
  AlertItem,
  LocationBreadcrumb,
  TrackerConfig,
} from "@/types/tracker";
import { mqttService } from "./mqttService";

type TrackerListener = (data: TrackerData) => void;
type ActivityListener = (logs: ActivityLogItem[]) => void;
type AlertsListener = (alerts: AlertItem[]) => void;
type BreadcrumbsListener = (trail: LocationBreadcrumb[]) => void;

class TrackerService {
  private currentData: TrackerData = {
    deviceId: "TRACKER01",
    latitude: 23.1905,
    longitude: 72.628,
    altitude: 54.2,
    satellites: 8,
    hdop: 1.2,
    movement: false,
    acceleration: {
      x: 0.12,
      y: -0.08,
      z: 9.72,
    },
    gyroscope: {
      x: 0.01,
      y: -0.02,
      z: 0.0,
    },
    batteryPercentage: 86,
    battery: 86,
    batteryVoltage: 3.92,
    gpsStatus: "valid",
    deviceStatus: "online",
    timestamp: new Date().toISOString(),
    speed: 0.0,
    heading: 42,
    wifiSsid: "Campus_IoT_WLAN",
    wifiRssi: -64,
    mqttTopic: "esp32/tracker01/telemetry",
    powerGatingState: "ACTIVE",
    firmwareVersion: "v1.4.2-esp32",
  };

  private activityLogs: ActivityLogItem[] = [
    {
      id: "act-1",
      timestamp: new Date(Date.now() - 420000).toISOString(),
      timeFormatted: new Date(Date.now() - 420000).toLocaleTimeString([], { hour12: false }),
      event: "Device online",
      location: "23.190200, 72.627800",
      type: "info",
      details: "Wi-Fi connected (RSSI: -64 dBm). MQTT broker handshaked.",
    },
    {
      id: "act-2",
      timestamp: new Date(Date.now() - 300000).toISOString(),
      timeFormatted: new Date(Date.now() - 300000).toLocaleTimeString([], { hour12: false }),
      event: "GPS 3D Fix Acquired",
      location: "23.190200, 72.627800",
      type: "gps",
      details: "NEO-6M locked onto 8 satellites (HDOP 1.2). MOSFET power gate open.",
    },
    {
      id: "act-3",
      timestamp: new Date(Date.now() - 150000).toISOString(),
      timeFormatted: new Date(Date.now() - 150000).toLocaleTimeString([], { hour12: false }),
      event: "Location updated",
      location: "23.190350, 72.627910",
      type: "info",
      details: "Periodic telemetry packet transmitted via MQTT.",
    },
    {
      id: "act-4",
      timestamp: new Date(Date.now() - 60000).toISOString(),
      timeFormatted: new Date(Date.now() - 60000).toLocaleTimeString([], { hour12: false }),
      event: "Movement detected",
      location: "23.190500, 72.628000",
      type: "movement",
      details: "MPU6050 motion interrupt triggered threshold (>0.15g).",
    },
  ];

  private alerts: AlertItem[] = [
    {
      id: "al-1",
      type: "movement",
      severity: "info",
      title: "Movement Detected",
      message: "Asset movement detected by MPU6050 accelerometer.",
      timestamp: new Date(Date.now() - 65000).toISOString(),
      acknowledged: false,
    },
  ];

  private breadcrumbs: LocationBreadcrumb[] = [
    { lat: 23.1902, lng: 72.6278, timestamp: new Date(Date.now() - 300000).toISOString(), speed: 0 },
    { lat: 23.19035, lng: 72.62791, timestamp: new Date(Date.now() - 150000).toISOString(), speed: 2.1 },
    { lat: 23.1905, lng: 72.628, timestamp: new Date(Date.now() - 60000).toISOString(), speed: 3.4 },
  ];

  private config: TrackerConfig = {
    demoMode: true,
    simulationIntervalMs: 3500,
    offlineTimeoutSeconds: 30,
    geofenceRadiusMeters: 250,
    geofenceCenter: [23.1905, 72.628],
    mqttBrokerUrl: "wss://broker.hivemq.com:8884/mqtt",
    mqttTopic: "esp32/tracker01/telemetry",
  };

  private trackerListeners: Set<TrackerListener> = new Set();
  private activityListeners: Set<ActivityListener> = new Set();
  private alertsListeners: Set<AlertsListener> = new Set();
  private breadcrumbsListeners: Set<BreadcrumbsListener> = new Set();

  private simulationTimer: NodeJS.Timeout | null = null;
  private offlineCheckTimer: NodeJS.Timeout | null = null;
  private demoWaypointIndex = 0;

  private demoWaypoints: [number, number, boolean, number][] = [
    [23.1905, 72.628, true, 3.2],
    [23.19053, 72.62804, true, 3.8],
    [23.19058, 72.62809, true, 4.1],
    [23.19064, 72.62816, true, 4.5],
    [23.19072, 72.62825, true, 4.2],
    [23.19079, 72.62836, true, 3.6],
    [23.19085, 72.62848, false, 0.4],
    [23.19086, 72.6285, false, 0.0],
    [23.19087, 72.62851, false, 0.0],
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

  constructor() {
    mqttService.subscribe((payload) => this.handleMqttPayload(payload));

    if (this.config.demoMode) {
      this.startSimulation();
    }

    this.startOfflineWatcher();
  }

  public getData(): TrackerData {
    return { ...this.currentData };
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

  public getConfig(): TrackerConfig {
    return { ...this.config };
  }

  public subscribeData(listener: TrackerListener): () => void {
    this.trackerListeners.add(listener);
    listener({ ...this.currentData });
    return () => {
      this.trackerListeners.delete(listener);
    };
  }

  public subscribeActivity(listener: ActivityListener): () => void {
    this.activityListeners.add(listener);
    listener([...this.activityLogs]);
    return () => {
      this.activityListeners.delete(listener);
    };
  }

  public subscribeAlerts(listener: AlertsListener): () => void {
    this.alertsListeners.add(listener);
    listener([...this.alerts]);
    return () => {
      this.alertsListeners.delete(listener);
    };
  }

  public subscribeBreadcrumbs(listener: BreadcrumbsListener): () => void {
    this.breadcrumbsListeners.add(listener);
    listener([...this.breadcrumbs]);
    return () => {
      this.breadcrumbsListeners.delete(listener);
    };
  }

  public setDemoMode(enabled: boolean) {
    this.config.demoMode = enabled;
    const latStr = this.currentData.latitude !== null ? this.currentData.latitude.toFixed(6) : "—";
    const lonStr = this.currentData.longitude !== null ? this.currentData.longitude.toFixed(6) : "—";

    if (enabled) {
      this.startSimulation();
      this.addActivity(
        "Demo Mode Enabled",
        `${latStr}, ${lonStr}`,
        "info",
        "Autonomous location and sensor simulator running."
      );
    } else {
      this.stopSimulation();
      this.addActivity(
        "Demo Mode Disabled",
        `${latStr}, ${lonStr}`,
        "info",
        "Awaiting live ESP32 MQTT telemetry frames."
      );
    }
    this.notifyData();
  }

  public handleMqttPayload(payload: MqttPayload) {
    const isMoving =
      payload.movement ??
      (Math.abs(payload.acceleration?.x || 0) > 0.15 || Math.abs(payload.acceleration?.y || 0) > 0.15);

    const prevMovement = this.currentData.movement;

    this.currentData = {
      ...this.currentData,
      deviceId: payload.device_id || payload.deviceId || this.currentData.deviceId,
      latitude: payload.latitude ?? this.currentData.latitude,
      longitude: payload.longitude ?? this.currentData.longitude,
      altitude: payload.altitude ?? this.currentData.altitude,
      satellites: payload.satellites ?? this.currentData.satellites,
      hdop: payload.hdop ?? this.currentData.hdop,
      movement: isMoving,
      acceleration: {
        x: payload.acceleration?.x ?? this.currentData.acceleration.x,
        y: payload.acceleration?.y ?? this.currentData.acceleration.y,
        z: payload.acceleration?.z ?? this.currentData.acceleration.z,
      },
      batteryPercentage: payload.battery_percentage ?? payload.batteryPercentage ?? payload.battery ?? this.currentData.batteryPercentage,
      battery: payload.battery !== undefined ? payload.battery : this.currentData.battery,
      batteryVoltage: payload.battery_voltage ?? payload.batteryVoltage ?? this.currentData.batteryVoltage,
      gpsStatus: (payload.gps_status as any) || (payload.satellites && payload.satellites >= 4 ? "valid" : "searching"),
      deviceStatus: "online",
      timestamp: payload.timestamp || new Date().toISOString(),
    };

    if (this.currentData.latitude !== null && this.currentData.longitude !== null) {
      this.addBreadcrumb(this.currentData.latitude, this.currentData.longitude, this.currentData.speed ?? undefined);
    }

    const latStr = this.currentData.latitude !== null ? this.currentData.latitude.toFixed(6) : "—";
    const lonStr = this.currentData.longitude !== null ? this.currentData.longitude.toFixed(6) : "—";

    if (isMoving && !prevMovement) {
      this.addActivity(
        "Movement detected",
        `${latStr}, ${lonStr}`,
        "movement",
        "MPU6050 motion interrupt triggered."
      );
      this.addAlert("movement", "info", "Movement Detected", "Tracker motion detected by MPU6050 sensor interrupt.");
    } else if (!isMoving && prevMovement) {
      this.addActivity(
        "Tracker stabilized",
        `${latStr}, ${lonStr}`,
        "info",
        "No significant acceleration detected."
      );
    }

    this.notifyData();
  }

  public acknowledgeAlert(id: string) {
    this.alerts = this.alerts.map((al) => (al.id === id ? { ...al, acknowledged: true } : al));
    this.notifyAlerts();
  }

  public clearAllAlerts() {
    this.alerts = [];
    this.notifyAlerts();
  }

  public clearBreadcrumbs() {
    this.breadcrumbs = [
      {
        lat: this.currentData.latitude ?? 23.1905,
        lng: this.currentData.longitude ?? 72.628,
        timestamp: new Date().toISOString(),
        speed: this.currentData.speed ?? 0,
      },
    ];
    this.notifyBreadcrumbs();
  }

  public simulateGpsLoss() {
    this.currentData.gpsStatus = this.currentData.gpsStatus === "lost" ? "valid" : "lost";
    this.currentData.satellites = this.currentData.gpsStatus === "lost" ? 0 : 8;
    this.currentData.hdop = this.currentData.gpsStatus === "lost" ? 99.9 : 1.2;
    const latStr = this.currentData.latitude !== null ? this.currentData.latitude.toFixed(6) : "—";
    const lonStr = this.currentData.longitude !== null ? this.currentData.longitude.toFixed(6) : "—";

    if (this.currentData.gpsStatus === "lost") {
      this.addAlert("gps_lost", "warning", "GPS Signal Lost", "NEO-6M satellite lock lost.");
      this.addActivity("GPS signal lost", "Signal Lost", "alert", "NEO-6M lost carrier lock. Satellites = 0.");
    } else {
      this.addActivity("GPS fix restored", `${latStr}, ${lonStr}`, "gps", "3D Fix reacquired with 8 satellites.");
    }
    this.notifyData();
  }

  public simulateToggleConnection() {
    const latStr = this.currentData.latitude !== null ? this.currentData.latitude.toFixed(6) : "—";
    const lonStr = this.currentData.longitude !== null ? this.currentData.longitude.toFixed(6) : "—";

    if (this.currentData.deviceStatus === "online") {
      this.currentData.deviceStatus = "offline";
      mqttService.setStatus("disconnected");
      this.addAlert("device_offline", "critical", "Device Offline", "No telemetry heartbeat received within timeout.");
      this.addActivity("Device offline", "Disconnected", "alert", "MQTT connection lost.");
    } else {
      this.currentData.deviceStatus = "online";
      this.currentData.timestamp = new Date().toISOString();
      mqttService.setStatus("connected");
      this.addActivity("Device reconnected", `${latStr}, ${lonStr}`, "info", "ESP32 Wi-Fi & MQTT re-established.");
    }
    this.notifyData();
  }

  public simulateLowBattery() {
    this.currentData.batteryPercentage = 14;
    this.currentData.battery = 14;
    this.currentData.batteryVoltage = 3.42;
    this.addAlert("low_battery", "critical", "Low Battery Warning", "Battery capacity at 14% (3.42V).");
    this.addActivity("Low Battery Alert", "Power Warning", "power", "Battery level below critical threshold (14%).");
    this.notifyData();
  }

  public simulateMotionBurst() {
    this.currentData.movement = true;
    this.currentData.acceleration = {
      x: +(Math.random() * 0.8 + 0.3).toFixed(2),
      y: -(Math.random() * 0.7 + 0.2).toFixed(2),
      z: +(9.72 + (Math.random() * 0.6 - 0.3)).toFixed(2),
    };
    const latStr = this.currentData.latitude !== null ? this.currentData.latitude.toFixed(6) : "—";
    const lonStr = this.currentData.longitude !== null ? this.currentData.longitude.toFixed(6) : "—";

    this.addAlert("movement", "info", "Motion Detected", "High acceleration spike registered by MPU6050.");
    this.addActivity("Movement detected", `${latStr}, ${lonStr}`, "movement", "MPU6050 interrupt triggered.");
    this.notifyData();
  }

  private startSimulation() {
    this.stopSimulation();
    this.simulationTimer = setInterval(() => {
      if (!this.config.demoMode || this.currentData.deviceStatus === "offline") return;

      this.demoWaypointIndex = (this.demoWaypointIndex + 1) % this.demoWaypoints.length;
      const [targetLat, targetLng, moving, speed] = this.demoWaypoints[this.demoWaypointIndex];

      const jitterLat = (Math.random() - 0.5) * 0.00001;
      const jitterLng = (Math.random() - 0.5) * 0.00001;
      const newLat = +(targetLat + jitterLat).toFixed(6);
      const newLng = +(targetLng + jitterLng).toFixed(6);

      const accelX = moving ? +(0.15 + (Math.random() * 0.3 - 0.15)).toFixed(2) : +(Math.random() * 0.04 - 0.02).toFixed(2);
      const accelY = moving ? +(-0.1 + (Math.random() * 0.25 - 0.1)).toFixed(2) : +(Math.random() * 0.04 - 0.02).toFixed(2);
      const accelZ = +(9.72 + (Math.random() * 0.18 - 0.09)).toFixed(2);

      const prevMoving = this.currentData.movement;

      const currentBatt = this.currentData.batteryPercentage ?? 85;
      const newBattery = Math.max(12, +(currentBatt - 0.02).toFixed(1));
      const newVoltage = +(3.7 + (newBattery / 100) * 0.45).toFixed(2);

      this.currentData = {
        ...this.currentData,
        latitude: newLat,
        longitude: newLng,
        movement: moving,
        speed: speed,
        acceleration: { x: accelX, y: accelY, z: accelZ },
        batteryPercentage: newBattery,
        battery: newBattery,
        batteryVoltage: newVoltage,
        timestamp: new Date().toISOString(),
        powerGatingState: moving ? "ACTIVE" : "LOW_POWER",
        heading: (this.currentData.heading! + (moving ? 12 : 0)) % 360,
      };

      this.addBreadcrumb(newLat, newLng, speed);

      if (this.demoWaypointIndex % 3 === 0) {
        this.addActivity(
          moving ? "Location updated" : "Heartbeat ping",
          `${newLat.toFixed(6)}, ${newLng.toFixed(6)}`,
          moving ? "info" : "power",
          moving ? `Speed: ${speed.toFixed(1)} km/h. Sats: ${this.currentData.satellites}` : "Device idle."
        );
      }

      if (moving && !prevMoving) {
        this.addAlert("movement", "info", "Movement Detected", "MPU6050 accelerometer wake-on-motion triggered.");
        this.addActivity("Movement detected", `${newLat.toFixed(6)}, ${newLng.toFixed(6)}`, "movement", "Motion wake interrupt active.");
      }

      this.notifyData();
    }, this.config.simulationIntervalMs || 3500);
  }

  private stopSimulation() {
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
  }

  private startOfflineWatcher() {
    if (this.offlineCheckTimer) clearInterval(this.offlineCheckTimer);
    this.offlineCheckTimer = setInterval(() => {
      if (!this.config.demoMode && this.currentData.deviceStatus === "online") {
        const lastMsgTime = new Date(this.currentData.timestamp).getTime();
        const diffSeconds = (Date.now() - lastMsgTime) / 1000;
        if (diffSeconds > (this.config.offlineTimeoutSeconds || 30)) {
          this.currentData.deviceStatus = "offline";
          this.addAlert("device_offline", "critical", "Device Offline", `No MQTT data received.`);
          this.addActivity("Device timed out", "Offline", "alert", "Watchdog triggered offline state.");
          this.notifyData();
        }
      }
    }, 5000);
  }

  private addActivity(event: string, location: string, type: ActivityLogItem["type"], details?: string) {
    const newLog: ActivityLogItem = {
      id: "act-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString([], { hour12: false }),
      event,
      location,
      type,
      details,
    };
    this.activityLogs = [newLog, ...this.activityLogs.slice(0, 49)];
    this.notifyActivity();
  }

  private addAlert(type: AlertItem["type"], severity: AlertItem["severity"], title: string, message: string) {
    const existing = this.alerts.find((a) => a.type === type && !a.acknowledged);
    if (existing) return;

    const newAlert: AlertItem = {
      id: "al-" + Date.now(),
      type,
      severity,
      title,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };
    this.alerts = [newAlert, ...this.alerts.slice(0, 19)];
    this.notifyAlerts();
  }

  private addBreadcrumb(lat: number, lng: number, speed?: number) {
    const last = this.breadcrumbs[this.breadcrumbs.length - 1];
    if (last && Math.abs(last.lat - lat) < 0.000005 && Math.abs(last.lng - lng) < 0.000005) {
      return;
    }
    const newPoint: LocationBreadcrumb = {
      lat,
      lng,
      timestamp: new Date().toISOString(),
      speed,
    };
    this.breadcrumbs = [...this.breadcrumbs.slice(-99), newPoint];
    this.notifyBreadcrumbs();
  }

  private notifyData() {
    const copy = { ...this.currentData };
    this.trackerListeners.forEach((fn) => fn(copy));
  }

  private notifyActivity() {
    const copy = [...this.activityLogs];
    this.activityListeners.forEach((fn) => fn(copy));
  }

  private notifyAlerts() {
    const copy = [...this.alerts];
    this.alertsListeners.forEach((fn) => fn(copy));
  }

  private notifyBreadcrumbs() {
    const copy = [...this.breadcrumbs];
    this.breadcrumbsListeners.forEach((fn) => fn(copy));
  }
}

export const trackerService = new TrackerService();
