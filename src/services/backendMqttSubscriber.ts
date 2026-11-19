import mqtt, { MqttClient } from "mqtt";
import { backendStore } from "./backendStore";

class BackendMqttSubscriber {
  private client: MqttClient | null = null;
  private isConnected: boolean = false;
  private brokerUrl: string;
  private topic: string;
  private reconnectAttempts: number = 0;

  constructor() {
    this.brokerUrl = process.env.MQTT_BROKER_URL || "mqtt://broker.hivemq.com:1883";
    this.topic = process.env.MQTT_TOPIC || "tracker/#";
  }

  public init() {
    if (this.client) return; // Already initialized

    try {
      const options: mqtt.IClientOptions = {
        clientId: `smarttrack_server_${Math.random().toString(16).substring(2, 8)}`,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 5000,
      };

      if (process.env.MQTT_USERNAME) {
        options.username = process.env.MQTT_USERNAME;
      }
      if (process.env.MQTT_PASSWORD) {
        options.password = process.env.MQTT_PASSWORD;
      }

      console.log(`[MQTT] Connecting to broker: ${this.brokerUrl} ...`);
      this.client = mqtt.connect(this.brokerUrl, options);

      this.client.on("connect", () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log(`[MQTT] Connected to broker successfully.`);

        // Subscribe to primary topic, plus location, status, battery, alert topics (Step 3)
        const topics = [
          this.topic,
          "tracker/location",
          "tracker/status",
          "tracker/battery",
          "tracker/alert",
          "esp32/tracker01/telemetry",
        ];

        topics.forEach((t) => {
          this.client?.subscribe(t, { qos: 1 }, (err) => {
            if (!err) {
              console.log(`[MQTT] Subscribed to topic: ${t}`);
            } else {
              console.error(`[MQTT] Subscription error on ${t}:`, err.message);
            }
          });
        });
      });

      this.client.on("message", (receivedTopic, messageBuffer) => {
        try {
          const rawString = messageBuffer.toString("utf8");
          const parsed = JSON.parse(rawString);

          // Step 3: Validate, parse, store in backendStore, and notify
          backendStore.ingestMqttPayload(parsed, receivedTopic);
        } catch (err: any) {
          console.warn(`[MQTT] Malformed packet received on ${receivedTopic}:`, err.message);
        }
      });

      this.client.on("error", (err) => {
        this.isConnected = false;
        // Log once or on state change
        if (this.reconnectAttempts === 0) {
          console.warn(`[MQTT] Broker notice: ${err.message}. Awaiting broker availability.`);
        }
        this.reconnectAttempts++;
      });

      this.client.on("close", () => {
        this.isConnected = false;
      });

      this.client.on("offline", () => {
        this.isConnected = false;
      });
    } catch (err: any) {
      console.warn(`[MQTT] Could not initialize MQTT client:`, err.message);
    }
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      brokerUrl: this.brokerUrl,
      topic: this.topic,
    };
  }

  /**
   * Helper to publish a test packet or forward from API
   */
  public publish(topic: string, message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected) {
        // If not connected to external broker, still ingest directly into store for test simulation!
        backendStore.ingestMqttPayload(message, topic);
        return resolve();
      }

      const payload = typeof message === "string" ? message : JSON.stringify(message);
      this.client.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) reject(err);
        else {
          // Also ingest locally
          backendStore.ingestMqttPayload(message, topic);
          resolve();
        }
      });
    });
  }
}

const globalForMqtt = globalThis as unknown as { __backendMqttSubscriber?: BackendMqttSubscriber };
export const backendMqttSubscriber = globalForMqtt.__backendMqttSubscriber || new BackendMqttSubscriber();
if (process.env.NODE_ENV !== "production") {
  globalForMqtt.__backendMqttSubscriber = backendMqttSubscriber;
}
