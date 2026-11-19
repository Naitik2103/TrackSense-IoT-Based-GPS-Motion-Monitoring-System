# TrackSense — IoT-Based GPS & Motion Monitoring System

An engineering IoT asset tracking and motion monitoring system featuring an **ESP32-WROOM-32**, **NEO-6M GPS receiver**, and **MPU6050 6-DoF inertial sensor** communicating via MQTT to a real-time web dashboard.

Built with **Next.js 14**, **React 18**, **TypeScript**, **Tailwind CSS**, **Leaflet**, and **OpenStreetMap**.

---

## 🛰 System Architecture

```text
  [ NEO-6M GPS ]        [ MPU6050 IMU ]
         │                      │
         │ (UART Serial2)       │ (I2C)
         └──────────┬───────────┘
                    ▼
          [ ESP32-WROOM-32 ]
                    │
                    │ Wi-Fi (802.11 b/g/n)
                    ▼
     [ MQTT Broker: HiveMQ (1883) ]
                    │
                    │ Topic: tracker/location
                    ▼
        [ Next.js Backend Engine ]
     - MQTT Subscriber (backendMqttSubscriber.ts)
     - In-Memory Telemetry Store (backendStore.ts)
     - 15s Watchdog Timeout Monitor
                    │
                    │ Server-Sent Events (SSE)
                    ▼
       [ TrackSense Live Dashboard ]
     - Leaflet & OpenStreetMap Live Canvas
     - Real-time GPS Fix, Altitude, HDOP
     - Real-time MPU6050 Acceleration Meters
     - Dynamic Google Maps Integration
```

---

## ⚡ Features

- **Standard OpenStreetMap & Leaflet Integration**: Clean, watermark-free map tiles with live position marker, accuracy radius ring based on HDOP, and direct Google Maps link.
- **Hardware Telemetry**: Displays exact GPS latitude, longitude, altitude, locked satellites count, and horizontal dilution of precision (HDOP).
- **Inertial Motion Telemetry**: Live linear acceleration along X, Y, and Z axes (with 1G gravity baseline) and movement status detection (Moving vs Stationary).
- **Dual Operating Modes**:
  - **Live Mode**: Awaits real hardware MQTT packets; displays no synthetic data.
  - **Demo Mode**: Real-time simulated campus trajectory for offline demonstration and testing.
- **ESP32 Connection Watchdog**: Automatically marks device as `Disconnected` if no MQTT telemetry frame is received within 15 seconds.
- **Complete Firmware Included**: Verified Arduino IDE C++ sketch in `firmware/esp32_smarttrack_mqtt.ino`.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Settings in `.env.local`:
```env
MQTT_BROKER_URL=mqtt://broker.hivemq.com:1883
MQTT_TOPIC=tracker/location
DEVICE_TIMEOUT_MS=15000
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 🔌 Hardware Wiring

### NEO-6M GPS Module to ESP32:
| NEO-6M Pin | ESP32 Pin | Function |
|---|---|---|
| **VCC** | 3.3V or 5V | Power |
| **GND** | GND | Ground |
| **TX** | GPIO 16 (RX2) | Serial Data from GPS to ESP32 |
| **RX** | GPIO 17 (TX2) | Serial Commands to GPS |

### MPU6050 to ESP32:
| MPU6050 Pin | ESP32 Pin | Function |
|---|---|---|
| **VCC** | 3.3V | Power |
| **GND** | GND | Ground |
| **SDA** | GPIO 21 | I2C Data Bus |
| **SCL** | GPIO 22 | I2C Clock Bus |

---

## 📡 MQTT Telemetry Payload Format

The dashboard listens on `tracker/location` (and `tracker/#`) for the following JSON schema:

```json
{
  "device_id": "TRACKER01",
  "latitude": 23.187574,
  "longitude": 72.626864,
  "altitude": 95.10,
  "satellites": 6,
  "hdop": 2.06,
  "gps_status": "valid",
  "acceleration": {
    "x": 0.12,
    "y": -0.08,
    "z": 9.79
  },
  "movement": false,
  "timestamp": "2026-11-19T14:50:00Z",
  "wifi_rssi": -64
}
```

---

## 🛠 Arduino IDE Firmware

The ESP32 firmware sketch is located at:
`firmware/esp32_smarttrack_mqtt.ino`

Required Arduino libraries:
1. `PubSubClient` by Nick O'Leary
2. `TinyGPSPlus` by Mikal Hart
3. `Adafruit MPU6050` by Adafruit
4. `Adafruit Unified Sensor` by Adafruit
5. `ArduinoJson` (v6 or v7) by Benoit Blanchon

---

## 📄 License
MIT License.
