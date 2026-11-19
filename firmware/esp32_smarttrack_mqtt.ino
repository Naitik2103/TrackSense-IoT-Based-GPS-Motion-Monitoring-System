/*
 * ==============================================================================
 * Project: SmartTrack — IoT-Based Smart Asset Tracker (College Engineering Project)
 * Target Hardware: ESP32-WROOM-32
 * Sensors:
 *   - NEO-6M GPS Module (UART Serial2: RX=16, TX=17)
 *   - MPU6050 6-DoF IMU (I2C: SDA=21, SCL=22)
 *   - (Optional) MOSFET Gate for GPS Power Gating: GPIO 4
 *
 * MQTT Target Payload:
 * {
 *   "device_id": "TRACKER01",
 *   "latitude": 23.187574,
 *   "longitude": 72.626864,
 *   "altitude": 95.10,
 *   "satellites": 6,
 *   "hdop": 2.06,
 *   "gps_status": "valid",
 *   "acceleration": { "x": 0.0, "y": 0.0, "z": 9.8 },
 *   "movement": false,
 *   "timestamp": "2026-11-19T14:50:00Z"
 * }
 *
 * Required Arduino Libraries (Install via Arduino Library Manager):
 *   1. "PubSubClient" by Nick O'Leary
 *   2. "TinyGPSPlus" by Mikal Hart
 *   3. "Adafruit MPU6050" by Adafruit
 *   4. "Adafruit Unified Sensor" by Adafruit
 *   5. "ArduinoJson" by Benoit Blanchon (v6 or v7)
 * ==============================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <TinyGPSPlus.h>
#include <ArduinoJson.h>

// -----------------------------------------------------------------------------
// CONFIGURATION: Wi-Fi Credentials & MQTT Broker
// -----------------------------------------------------------------------------
const char* WIFI_SSID     = "YOUR_WIFI_SSID";         // Replace with your Wi-Fi SSID
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";     // Replace with your Wi-Fi Password

// MQTT Broker Settings (Matching Next.js dashboard default .env.local)
const char* MQTT_BROKER   = "broker.hivemq.com";
const int   MQTT_PORT     = 1883;
const char* MQTT_CLIENT_ID= "ESP32_TRACKER01_PUB";
const char* MQTT_TOPIC    = "tracker/location";

// If using authenticated broker (optional):
const char* MQTT_USER     = "";  // Leave blank for public HiveMQ
const char* MQTT_PASS     = "";  // Leave blank for public HiveMQ

// -----------------------------------------------------------------------------
// PIN DEFINITIONS
// -----------------------------------------------------------------------------
#define GPS_RX_PIN        16   // ESP32 RX2 connects to NEO-6M TX
#define GPS_TX_PIN        17   // ESP32 TX2 connects to NEO-6M RX
#define GPS_BAUD_RATE     9600

#define I2C_SDA_PIN       21   // ESP32 SDA connects to MPU6050 SDA
#define I2C_SCL_PIN       22   // ESP32 SCL connects to MPU6050 SCL

#define MOSFET_GPS_GATE   4    // High = GPS ON, Low = GPS OFF (optional power gate)
#define STATUS_LED_PIN    2    // Built-in LED on ESP32

// Telemetry interval (milliseconds)
const unsigned long TELEMETRY_INTERVAL_MS = 5000; // Publish every 5 seconds
unsigned long lastPublishTime = 0;

// Movement detection parameters
const float MOTION_THRESHOLD = 1.35; // Acceleration deviation (m/s^2) from 1G baseline (9.8 m/s^2)

// -----------------------------------------------------------------------------
// SENSORS & CLIENT INSTANCES
// -----------------------------------------------------------------------------
WiFiClient espClient;
PubSubClient mqttClient(espClient);
HardwareSerial gpsSerial(2);
TinyGPSPlus gps;
Adafruit_MPU6050 mpu;

bool mpuAvailable = false;

// -----------------------------------------------------------------------------
// HELPER: Connect to Wi-Fi
// -----------------------------------------------------------------------------
void setupWiFi() {
  delay(10);
  Serial.println();
  Serial.print("[Wi-Fi] Connecting to: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN)); // Blink LED
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    Serial.println("\n[Wi-Fi] Connected successfully!");
    Serial.print("[Wi-Fi] IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("[Wi-Fi] Signal Strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n[Wi-Fi] Connection failed. Will retry in loop...");
  }
}

// -----------------------------------------------------------------------------
// HELPER: Reconnect to MQTT Broker
// -----------------------------------------------------------------------------
void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Attempting connection to ");
    Serial.print(MQTT_BROKER);
    Serial.print("...");

    bool connected = false;
    if (strlen(MQTT_USER) > 0) {
      connected = mqttClient.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS);
    } else {
      connected = mqttClient.connect(MQTT_CLIENT_ID);
    }

    if (connected) {
      Serial.println(" CONNECTED!");
      // Optionally publish an online status message
      mqttClient.publish("tracker/status", "{\"device_id\":\"TRACKER01\",\"status\":\"online\"}");
    } else {
      Serial.print(" FAILED, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" -> Retrying in 4 seconds...");
      delay(4000);
    }
  }
}

// -----------------------------------------------------------------------------
// ARDUINO SETUP
// -----------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  // Initialize MOSFET Power Gate for GPS (turn ON NEO-6M)
  pinMode(MOSFET_GPS_GATE, OUTPUT);
  digitalWrite(MOSFET_GPS_GATE, HIGH);

  Serial.println("\n========================================================");
  Serial.println("  SmartTrack — IoT Asset Tracker ESP32 Firmware Starting");
  Serial.println("========================================================");

  // Initialize NEO-6M GPS UART
  gpsSerial.begin(GPS_BAUD_RATE, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("[GPS] NEO-6M Serial initialized on RX:16, TX:17 at 9600 baud.");

  // Initialize MPU6050
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  if (mpu.begin()) {
    mpuAvailable = true;
    mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    Serial.println("[MPU6050] Accelerometer & Gyroscope initialized successfully!");
  } else {
    Serial.println("[MPU6050] WARNING: MPU6050 sensor not detected on I2C bus.");
  }

  // Connect Wi-Fi & Configure MQTT
  setupWiFi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setBufferSize(512); // Buffer size for JSON payload
}

// -----------------------------------------------------------------------------
// ARDUINO MAIN LOOP
// -----------------------------------------------------------------------------
void loop() {
  // Feed GPS characters from UART to TinyGPSPlus parser continuously
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  // Ensure Wi-Fi connection
  if (WiFi.status() != WL_CONNECTED) {
    setupWiFi();
  }

  // Ensure MQTT connection
  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();

  // Periodic Telemetry Publishing
  unsigned long now = millis();
  if (now - lastPublishTime >= TELEMETRY_INTERVAL_MS) {
    lastPublishTime = now;

    // 1. Read MPU6050 Acceleration
    float ax = 0.0, ay = 0.0, az = 9.81;
    bool isMoving = false;

    if (mpuAvailable) {
      sensors_event_t a, g, temp;
      mpu.getEvent(&a, &g, &temp);
      ax = a.acceleration.x;
      ay = a.acceleration.y;
      az = a.acceleration.z;

      // Net magnitude = sqrt(ax^2 + ay^2 + az^2)
      float netMag = sqrt(ax * ax + ay * ay + az * az);
      // Motion check: is acceleration deviation from earth gravity (9.81 m/s^2) greater than threshold?
      if (abs(netMag - 9.81) > MOTION_THRESHOLD) {
        isMoving = true;
      }
    }

    // 2. Read NEO-6M GPS Data
    bool gpsHasFix = gps.location.isValid() && (gps.satellites.value() >= 3);
    double lat = gps.location.isValid() ? gps.location.lat() : 0.0;
    double lng = gps.location.isValid() ? gps.location.lng() : 0.0;
    double alt = gps.altitude.isValid() ? gps.altitude.meters() : 0.0;
    int sats   = gps.satellites.isValid() ? gps.satellites.value() : 0;
    float hdop = gps.hdop.isValid() ? (gps.hdop.value() / 100.0) : 9.99;

    const char* gpsStatus = gpsHasFix ? "valid" : "searching";

    // 3. Build ISO Timestamp (from GPS if valid, otherwise system uptime)
    char timestamp[32];
    if (gps.date.isValid() && gps.time.isValid()) {
      snprintf(timestamp, sizeof(timestamp), "%04d-%02d-%02dT%02d:%02d:%02dZ",
               gps.date.year(), gps.date.month(), gps.date.day(),
               gps.time.hour(), gps.time.minute(), gps.time.second());
    } else {
      snprintf(timestamp, sizeof(timestamp), "UPTIME_%lu_S", millis() / 1000);
    }

    // 4. Construct JSON Payload (Schema expected by SmartTrack Next.js Backend)
    StaticJsonDocument<384> doc;
    doc["device_id"] = "TRACKER01";

    if (gpsHasFix) {
      doc["latitude"]  = serialized(String(lat, 6)); // Exact 6 decimal precision
      doc["longitude"] = serialized(String(lng, 6));
      doc["altitude"]  = serialized(String(alt, 2));
    } else {
      doc["latitude"]  = nullptr;
      doc["longitude"] = nullptr;
      doc["altitude"]  = nullptr;
    }

    doc["satellites"] = sats;
    doc["hdop"]       = serialized(String(hdop, 2));
    doc["gps_status"] = gpsStatus;

    JsonObject accel = doc.createNestedObject("acceleration");
    accel["x"] = serialized(String(ax, 2));
    accel["y"] = serialized(String(ay, 2));
    accel["z"] = serialized(String(az, 2));

    doc["movement"]  = isMoving;
    doc["timestamp"] = timestamp;

    // Optional battery & RSSI telemetry
    doc["wifi_rssi"] = WiFi.RSSI();

    char jsonBuffer[384];
    serializeJson(doc, jsonBuffer);

    // 5. Publish to MQTT Broker
    bool published = mqttClient.publish(MQTT_TOPIC, jsonBuffer);
    if (published) {
      Serial.print("[MQTT Published] -> ");
      Serial.println(jsonBuffer);
      // Blink LED on publish
      digitalWrite(STATUS_LED_PIN, LOW);
      delay(40);
      digitalWrite(STATUS_LED_PIN, HIGH);
    } else {
      Serial.println("[MQTT Error] Failed to publish message.");
    }
  }
}
