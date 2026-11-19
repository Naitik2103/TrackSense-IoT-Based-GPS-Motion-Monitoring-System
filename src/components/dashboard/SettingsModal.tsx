"use client";

import React, { useState } from "react";
import { X, Server, Code, CheckCircle, Copy } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: {
    mqttBrokerUrl: string;
    mqttTopic: string;
    offlineTimeoutSeconds: number;
  };
  onUpdateConfig: (newConfig: any) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
}: SettingsModalProps) {
  const [brokerUrl, setBrokerUrl] = useState(config.mqttBrokerUrl);
  const [topic, setTopic] = useState(config.mqttTopic);
  const [timeoutSec, setTimeoutSec] = useState(config.offlineTimeoutSeconds);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<"mqtt" | "code" | "telemetry">("mqtt");

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateConfig({
      mqttBrokerUrl: brokerUrl,
      mqttTopic: topic,
      offlineTimeoutSeconds: timeoutSec,
    });
    onClose();
  };

  const sampleEsp32Code = `// ESP32 Arduino Code - SmartTrack IoT Asset Tracker
#include <WiFi.h>
#include <PubSubClient.h>
#include <TinyGPSPlus.h>
#include <Adafruit_MPU6050.h>

const char* ssid = "Campus_IoT_WLAN";
const char* password = "secret_password";
const char* mqtt_server = "broker.hivemq.com"; // or your IP
const int mqtt_port = 1883;
const char* telemetry_topic = "tracker/location";

WiFiClient espClient;
PubSubClient client(espClient);
TinyGPSPlus gps;
Adafruit_MPU6050 mpu;

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, 16, 17); // NEO-6M RX=16, TX=17
  mpu.begin();
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
  
  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) { reconnect(); }
  client.loop();
  
  while (Serial2.available() > 0) {
    gps.encode(Serial2.read());
  }

  // Publish telemetry every 3 seconds
  static unsigned long lastMsg = 0;
  if (millis() - lastMsg > 3000) {
    lastMsg = millis();
    publishTelemetry();
  }
}

void publishTelemetry() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  bool moving = (fabs(a.acceleration.x) > 0.15 || fabs(a.acceleration.y) > 0.15);
  int rssi = WiFi.RSSI();

  char payload[350];
  snprintf(payload, sizeof(payload),
    "{"
    "\\"device_id\\":\\"TRACKER01\\","
    "\\"latitude\\":%.6f,\\"longitude\\":%.6f,"
    "\\"altitude\\":%.1f,\\"satellites\\":%d,"
    "\\"hdop\\":%.2f,\\"gps_status\\":\\"%s\\","
    "\\"movement\\":%s,"
    "\\"acceleration\\":{\\"x\\":%.2f,\\"y\\":%.2f,\\"z\\":%.2f},"
    "\\"battery_percentage\\":86,\\"battery_voltage\\":4.09,"
    "\\"wifi_rssi\\":%d,\\"gps_power\\":true"
    "}",
    gps.location.isValid() ? gps.location.lat() : 23.190500,
    gps.location.isValid() ? gps.location.lng() : 72.628000,
    gps.altitude.isValid() ? gps.altitude.meters() : 54.2,
    gps.satellites.isValid() ? gps.satellites.value() : 8,
    gps.hdop.isValid() ? gps.hdop.hdop() : 1.20,
    gps.location.isValid() ? "valid" : "searching",
    moving ? "true" : "false",
    a.acceleration.x, a.acceleration.y, a.acceleration.z,
    rssi
  );

  client.publish(telemetry_topic, payload);
  Serial.print("Published to MQTT: ");
  Serial.println(payload);
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("ESP32_SmartTrack_01")) {
      Serial.println("MQTT Connected");
    } else {
      delay(2000);
    }
  }
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sampleEsp32Code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wider">
                System & MQTT Broker Settings
              </h2>
              <p className="text-xs text-slate-400">
                Configure IoT communication pipeline and firmware integration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-800 px-6 gap-4 text-xs font-mono">
          <button
            onClick={() => setActiveTab("mqtt")}
            className={`py-2.5 border-b-2 font-semibold transition-colors ${
              activeTab === "mqtt"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            MQTT Parameters
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`py-2.5 border-b-2 font-semibold transition-colors ${
              activeTab === "code"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            ESP32 Firmware Code
          </button>
          <button
            onClick={() => setActiveTab("telemetry")}
            className={`py-2.5 border-b-2 font-semibold transition-colors ${
              activeTab === "telemetry"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            REST API Endpoints
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 space-y-4">
          {activeTab === "mqtt" && (
            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  MQTT Broker URL:
                </label>
                <input
                  type="text"
                  value={brokerUrl}
                  onChange={(e) => setBrokerUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-hidden focus:border-sky-500"
                  placeholder="mqtt://broker.hivemq.com:1883"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Configured via environment variable MQTT_BROKER_URL.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Subscription Topic:
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-hidden focus:border-sky-500"
                  placeholder="tracker/#"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Subscribes to tracker/location, tracker/status, tracker/battery, etc.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Device Offline Watchdog Timeout:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={timeoutSec}
                    onChange={(e) => setTimeoutSec(Number(e.target.value))}
                    className="w-28 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-hidden focus:border-sky-500"
                  />
                  <span className="text-slate-400">seconds without MQTT heartbeat before flagging Offline</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "code" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>ESP32 Arduino C++ Snippet:</span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 text-sky-400 hover:text-sky-300"
                >
                  {copiedCode ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-slate-950 border border-slate-800 rounded p-3 text-[11px] font-mono text-slate-300 max-h-60 overflow-y-auto">
                {sampleEsp32Code}
              </pre>
            </div>
          )}

          {activeTab === "telemetry" && (
            <div className="space-y-3 text-xs font-mono text-slate-300">
              <p>
                The backend exposes typed endpoints for real-time and fallback integration:
              </p>
              <div className="bg-slate-950 border border-slate-800 rounded p-2.5 space-y-1.5">
                <div className="text-sky-400 font-bold">GET /api/tracker/latest</div>
                <div className="text-slate-400 text-[11px]">Returns latest JSON snapshot of the tracker.</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded p-2.5 space-y-1.5">
                <div className="text-emerald-400 font-bold">GET /api/tracker/stream</div>
                <div className="text-slate-400 text-[11px]">Server-Sent Events (SSE) live stream delivering instant updates.</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded p-2.5 space-y-1.5">
                <div className="text-amber-400 font-bold">POST /api/tracker/publish</div>
                <div className="text-slate-400 text-[11px]">Accepts JSON telemetry frame and pushes into the MQTT subscriber store.</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-mono font-semibold shadow-sm transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
