import { MqttPayload } from "@/types/tracker";

export type MqttConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export type MessageListener = (payload: MqttPayload) => void;
export type StatusListener = (status: MqttConnectionStatus) => void;

class MqttService {
  private status: MqttConnectionStatus = "connected"; // Default connected for mock simulation
  private messageListeners: Set<MessageListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private brokerUrl: string = "wss://broker.hivemq.com:8884/mqtt";
  private topic: string = "esp32/tracker01/telemetry";

  constructor() {
    // Ready for real MQTT client (e.g. mqtt.js) or local bridge
  }

  public getStatus(): MqttConnectionStatus {
    return this.status;
  }

  public getTopic(): string {
    return this.topic;
  }

  public getBrokerUrl(): string {
    return this.brokerUrl;
  }

  public setConfig(brokerUrl: string, topic: string) {
    this.brokerUrl = brokerUrl;
    this.topic = topic;
  }

  public subscribe(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public setStatus(status: MqttConnectionStatus) {
    this.status = status;
    this.statusListeners.forEach((fn) => fn(status));
  }

  /**
   * Called when telemetry payload arrives (via simulated ticker, websocket, or HTTP webhook)
   */
  public ingestPayload(payload: MqttPayload) {
    this.messageListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error("Error in MQTT payload listener:", err);
      }
    });
  }

  /**
   * Helper to parse raw JSON string from MQTT broker
   */
  public ingestRawJson(rawJson: string) {
    try {
      const parsed = JSON.parse(rawJson);
      this.ingestPayload(parsed);
    } catch (err) {
      console.error("Failed to parse incoming MQTT JSON packet:", err);
    }
  }
}

export const mqttService = new MqttService();
