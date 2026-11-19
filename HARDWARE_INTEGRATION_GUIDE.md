# SmartTrack — Hardware Integration & Testing Guide

This guide provides the complete end-to-end instructions for connecting your **ESP32-WROOM-32**, **NEO-6M GPS**, and **MPU6050** to the SmartTrack real-time dashboard.

---

## 1. System Architecture

```
ESP32 + NEO-6M + MPU6050
         │
         │ Wi-Fi
         ▼
   MQTT Broker (broker.hivemq.com:1883)
         │
         │ Topic: tracker/location
         ▼
Next.js Backend MQTT Subscriber (services/backendMqttSubscriber.ts)
         │
         │ In-memory State + 15s Watchdog (services/backendStore.ts)
         ▼
Server-Sent Events (SSE) Stream (/api/tracker/stream)
         │
         ▼
SmartTrack Real-Time Dashboard (Leaflet + OpenStreetMap + Telemetry Cards)
```

---

## 2. Hardware Wiring Diagram

### NEO-6M GPS Module to ESP32:
| NEO-6M Pin | ESP32 Pin | Function |
|---|---|---|
| **VCC** | 3.3V or 5V (or Drain of MOSFET if power gating) | Power |
| **GND** | GND | Ground |
| **TX** | GPIO 16 (RX2) | Serial Data from GPS to ESP32 |
| **RX** | GPIO 17 (TX2) | Serial Commands to GPS |

### MPU6050 Accelerometer/Gyro to ESP32:
| MPU6050 Pin | ESP32 Pin | Function |
|---|---|---|
| **VCC** | 3.3V | Power |
| **GND** | GND | Ground |
| **SDA** | GPIO 21 | I2C Data |
| **SCL** | GPIO 22 | I2C Clock |

*(Optional) MOSFET GPS Power Gate:* Gate connected to **GPIO 4**.

---

## 3. Arduino IDE Setup & Required Libraries

In the Arduino IDE (**Sketch > Include Library > Manage Libraries...**), install the following libraries:

1. **`PubSubClient`** by Nick O'Leary
2. **`TinyGPSPlus`** by Mikal Hart
3. **`Adafruit MPU6050`** by Adafruit
4. **`Adafruit Unified Sensor`** by Adafruit
5. **`ArduinoJson`** by Benoit Blanchon (v6 or v7)

---

## 4. Flashing the ESP32

1. Open the sketch located at:
   `firmware/esp32_smarttrack_mqtt.ino`
2. Update your local Wi-Fi credentials:
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_SSID";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   ```
3. Connect your ESP32 via USB and select **Board: "ESP32 Dev Module"** and your COM Port.
4. Click **Upload** and open **Serial Monitor** at **115200 baud**.
5. Once connected, you will see:
   ```
   [Wi-Fi] Connected successfully!
   [MQTT] Attempting connection to broker.hivemq.com... CONNECTED!
   [MQTT Published] -> {"device_id":"TRACKER01","latitude":23.187574,"longitude":72.626864,...}
   ```

---

## 5. Testing the Complete Flow

1. Start the SmartTrack dashboard:
   ```bash
   npm run start
   ```
   Open `http://localhost:3000` in your browser.
2. The dashboard starts in **Live Mode** with the device status waiting for telemetry.
3. Power on your ESP32:
   - Within 5 seconds, the dashboard header transitions to **`● Device Online`**.
   - The Leaflet map flies to center on the tracker's exact coordinates.
   - The **Overview Cards** update with your live GPS coordinates, satellite count, altitude, and HDOP.
   - The **Movement Card** & **MPU6050 Panel** display real-time X, Y, Z acceleration meters.
   - Click **"Inspect MQTT Packet"** in the Developer Tools panel to observe the live JSON packet payload received by the dashboard.
   - Click **"Open in Google Maps"** to open your hardware's exact location in a new Google Maps tab.
4. **Offline Watchdog**: If you disconnect the ESP32 power, the backend watchdog will automatically mark the device as **`Device Offline`** after 15 seconds.
