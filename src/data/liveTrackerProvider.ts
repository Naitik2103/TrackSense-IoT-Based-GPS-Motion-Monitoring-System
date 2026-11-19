import {
  TrackerData,
  ActivityLogItem,
  AlertItem,
  LocationBreadcrumb,
} from "@/types/tracker";

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
  private eventSource: EventSource | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;

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
  private rawMqttPayload: Record<string, any> | null = null;

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // 1. Initial REST fetch
    this.fetchLatest();
    this.fetchActivity();
    this.fetchAlerts();

    // 2. Start SSE real-time stream
    this.connectStream();

    // 3. Fallback polling timer every 3000ms in case SSE is interrupted
    this.pollingTimer = setInterval(() => {
      if (!this.isConnected) {
        this.fetchLatest();
      }
    }, 3000);
  }

  public stop() {
    this.isRunning = false;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isConnected = false;
  }

  public subscribe(listener: LiveListener): () => void {
    this.listeners.add(listener);
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
      rawPayload: this.rawMqttPayload,
      isConnected: this.isConnected,
    };
  }

  private notify() {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => {
      try {
        fn(snap);
      } catch (err) {
        console.error("Error in live listener:", err);
      }
    });
  }

  private connectStream() {
    if (typeof window === "undefined") return;
    if (this.eventSource) this.eventSource.close();

    try {
      this.eventSource = new EventSource("/api/tracker/stream");

      this.eventSource.addEventListener("snapshot", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data);
          this.applyPayload(payload);
          this.isConnected = true;
          this.notify();
        } catch (err) {
          console.error("Error parsing SSE snapshot:", err);
        }
      });

      this.eventSource.addEventListener("telemetry", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data);
          this.applyPayload(payload);
          this.isConnected = true;
          this.notify();
        } catch (err) {
          console.error("Error parsing SSE telemetry:", err);
        }
      });

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.notify();
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        // The browser will auto-reconnect SSE, but polling fallback will cover in meantime
      };
    } catch (err) {
      console.warn("SSE connection error, falling back to polling:", err);
      this.isConnected = false;
    }
  }

  private applyPayload(payload: any) {
    if (payload.tracker) {
      this.currentData = payload.tracker;
    }
    if (Array.isArray(payload.activity)) {
      this.activityLogs = payload.activity;
    }
    if (Array.isArray(payload.alerts)) {
      this.alerts = payload.alerts;
    }
    if (Array.isArray(payload.breadcrumbs)) {
      this.breadcrumbs = payload.breadcrumbs;
    }
    if (payload.rawPayload) {
      this.rawMqttPayload = payload.rawPayload;
    }
  }

  private async fetchLatest() {
    try {
      const res = await fetch("/api/tracker/latest");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          this.currentData = json.data;
          this.rawMqttPayload = json.rawPayload || this.rawMqttPayload;
          this.notify();
        }
      }
    } catch {
      // Offline / server starting
    }
  }

  private async fetchActivity() {
    try {
      const res = await fetch("/api/tracker/activity");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.activity)) {
          this.activityLogs = json.activity;
          this.notify();
        }
      }
    } catch {}
  }

  private async fetchAlerts() {
    try {
      const res = await fetch("/api/tracker/alerts");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.alerts)) {
          this.alerts = json.alerts;
          this.notify();
        }
      }
    } catch {}
  }

  public async acknowledgeAlert(id: string) {
    this.alerts = this.alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a));
    this.notify();
    try {
      await fetch("/api/tracker/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acknowledge", id }),
      });
    } catch {}
  }

  public async clearAllAlerts() {
    this.alerts = [];
    this.notify();
    try {
      await fetch("/api/tracker/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_all" }),
      });
    } catch {}
  }

  public clearBreadcrumbs() {
    this.breadcrumbs = [];
    this.notify();
  }

  public async publishTestFrame(payload: any) {
    const res = await fetch("/api/tracker/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  }
}

export const liveTrackerProvider = new LiveTrackerProvider();
