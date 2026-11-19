export type GpsFixStatus = "valid" | "searching" | "lost";
export type DeviceConnectionStatus = "online" | "offline" | "connecting";
export type DashboardMode = "live" | "demo";

export interface AccelerationData {
  x: number;
  y: number;
  z: number;
}

export interface GyroscopeData {
  x: number;
  y: number;
  z: number;
}

/**
 * Standard Central Tracker Data Model (Step 1)
 */
export interface TrackerData {
  deviceId: string;

  latitude: number | null;
  longitude: number | null;
  altitude: number | null;

  satellites: number;
  hdop: number;

  gpsStatus: GpsFixStatus;

  movement: boolean;

  acceleration: AccelerationData;
  gyroscope?: GyroscopeData;

  batteryPercentage: number | null;
  battery?: number | null; // Backwards-compatible alias
  batteryVoltage: number | null;

  wifiRssi: number | null;
  wifiSsid?: string | null;

  gpsPower?: boolean | null; // MOSFET-based GPS power gating (ON / OFF)
  powerGatingState?: string | null;
  firmwareVersion?: string;
  mqttTopic?: string;

  speed?: number | null; // km/h
  heading?: number | null; // degrees

  timestamp: string;

  deviceStatus: DeviceConnectionStatus;

  // Metadata
  rawMqttPayload?: Record<string, any> | null;
}

/**
 * Expected MQTT Payload Schema from ESP32 (Step 2)
 */
export interface MqttTelemetryPayload {
  device_id?: string;
  deviceId?: string;

  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;

  satellites?: number;
  hdop?: number;

  gps_status?: string;
  gpsStatus?: string;

  movement?: boolean;

  acceleration?: {
    x?: number;
    y?: number;
    z?: number;
  };

  battery_percentage?: number | null;
  batteryPercentage?: number | null;
  battery?: number | null;

  battery_voltage?: number | null;
  batteryVoltage?: number | null;

  wifi_rssi?: number | null;
  wifiRssi?: number | null;

  gps_power?: boolean | null;
  gpsPower?: boolean | null;

  speed?: number | null;
  heading?: number | null;

  timestamp?: string;
}

export type MqttPayload = MqttTelemetryPayload;

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  timeFormatted: string;
  event: string;
  location: string;
  type: "info" | "movement" | "gps" | "power" | "alert" | "system";
  details?: string;
}

export interface AlertItem {
  id: string;
  type: "movement" | "gps_lost" | "device_offline" | "low_battery" | "geofence";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface LocationBreadcrumb {
  lat: number;
  lng: number;
  timestamp: string;
  speed?: number | null;
}

export interface TrackerConfig {
  mode?: DashboardMode;
  demoMode?: boolean;
  simulationIntervalMs?: number;
  offlineTimeoutSeconds?: number;
  mqttBrokerUrl: string;
  mqttTopic: string;
  deviceTimeoutMs?: number;
  geofenceRadiusMeters: number;
  geofenceCenter: [number, number];
}
