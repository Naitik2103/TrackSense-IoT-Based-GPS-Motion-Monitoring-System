import { NextResponse } from "next/server";
import { backendStore } from "@/services/backendStore";
import { backendMqttSubscriber } from "@/services/backendMqttSubscriber";

export const dynamic = "force-dynamic";

export async function GET() {
  backendMqttSubscriber.init();
  return NextResponse.json(backendStore.getSnapshot());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    backendMqttSubscriber.init();
    const updated = backendStore.ingestMqttPayload(body, "tracker/location");
    return NextResponse.json({
      status: "success",
      message: "Telemetry ingested",
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
