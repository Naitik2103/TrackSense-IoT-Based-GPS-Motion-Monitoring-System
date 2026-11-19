import { NextResponse } from "next/server";
import { backendMqttSubscriber } from "@/services/backendMqttSubscriber";
import { backendStore } from "@/services/backendStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const topic = request.headers.get("x-mqtt-topic") || "tracker/location";

    // Ingest into backend store & attempt broker publish
    backendStore.ingestMqttPayload(payload, topic);
    backendMqttSubscriber.publish(topic, payload).catch((err) => {
      console.warn("MQTT broker publish notice (local store updated):", err.message);
    });

    return NextResponse.json({
      status: "success",
      message: "Telemetry frame ingested into backend IoT pipeline",
      device: payload.device_id || payload.deviceId || "TRACKER01",
      receivedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Invalid MQTT JSON format", details: err.message },
      { status: 400 }
    );
  }
}
